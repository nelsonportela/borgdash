import os
import paramiko
from typing import Tuple, Optional
from pathlib import Path

from ..config import settings


class SSHService:
    """Service for SSH key management and connections."""
    
    def __init__(self):
        self.ssh_key_dir = Path(settings.SSH_KEY_DIR)
        self.ssh_key_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_ssh_key_pair(self, key_name: str, key_type: str = "rsa") -> Tuple[str, str]:
        """Generate SSH key pair and return paths to private and public keys."""
        
        private_key_path = self.ssh_key_dir / f"{key_name}"
        public_key_path = self.ssh_key_dir / f"{key_name}.pub"
        
        if key_type.lower() == "rsa":
            key = paramiko.RSAKey.generate(2048)
        elif key_type.lower() == "ed25519":
            key = paramiko.Ed25519Key.generate()
        else:
            raise ValueError(f"Unsupported key type: {key_type}")
        
        # Save private key
        key.write_private_key_file(str(private_key_path))
        os.chmod(private_key_path, 0o600)
        
        # Save public key
        with open(public_key_path, 'w') as f:
            f.write(f"{key.get_name()} {key.get_base64()}")
        
        return str(private_key_path), str(public_key_path)
    
    def test_ssh_connection(
        self, 
        hostname: str, 
        port: int, 
        username: str, 
        private_key_path: str
    ) -> Tuple[bool, Optional[str]]:
        """Test SSH connection with given parameters."""
        
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Load private key
            if not os.path.exists(private_key_path):
                return False, f"Private key not found: {private_key_path}"
            
            try:
                private_key = paramiko.RSAKey.from_private_key_file(private_key_path)
            except paramiko.PasswordRequiredException:
                return False, "Private key is encrypted (not supported yet)"
            except Exception as e:
                # Try Ed25519 key
                try:
                    private_key = paramiko.Ed25519Key.from_private_key_file(private_key_path)
                except Exception:
                    return False, f"Unable to load private key: {str(e)}"
            
            # Test connection
            ssh.connect(
                hostname=hostname,
                port=port,
                username=username,
                pkey=private_key,
                timeout=10
            )
            
            # Test if borg is available
            stdin, stdout, stderr = ssh.exec_command("which borg")
            borg_path = stdout.read().decode().strip()
            
            ssh.close()
            
            if borg_path:
                return True, f"Connected successfully. Borg found at: {borg_path}"
            else:
                return True, "Connected successfully. Warning: Borg not found in PATH"
                
        except paramiko.AuthenticationException:
            return False, "Authentication failed"
        except paramiko.SSHException as e:
            return False, f"SSH error: {str(e)}"
        except Exception as e:
            return False, f"Connection error: {str(e)}"
    
    def list_ssh_keys(self) -> list:
        """List available SSH keys."""
        keys = []
        
        for file_path in self.ssh_key_dir.glob("*"):
            if file_path.is_file() and not file_path.name.endswith('.pub'):
                # Check if corresponding public key exists
                pub_key_path = file_path.with_suffix('.pub')
                if pub_key_path.exists():
                    keys.append({
                        'name': file_path.name,
                        'private_key_path': str(file_path),
                        'public_key_path': str(pub_key_path),
                        'created': file_path.stat().st_ctime
                    })
        
        return keys
    
    def delete_ssh_key(self, key_name: str) -> bool:
        """Delete SSH key pair."""
        private_key_path = self.ssh_key_dir / key_name
        public_key_path = self.ssh_key_dir / f"{key_name}.pub"
        
        deleted = False
        
        if private_key_path.exists():
            private_key_path.unlink()
            deleted = True
        
        if public_key_path.exists():
            public_key_path.unlink()
            deleted = True
        
        return deleted
    
    def get_public_key_content(self, key_name: str) -> Optional[str]:
        """Get public key content for copying to remote servers."""
        public_key_path = self.ssh_key_dir / f"{key_name}.pub"
        
        if public_key_path.exists():
            return public_key_path.read_text().strip()
        
        return None