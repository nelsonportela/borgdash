import { useState, useMemo } from 'react';

interface FileItem {
  type: string;
  path: string;
  size?: number;
  mtime?: string;
  mode?: string;
  user?: string;
  group?: string;
}

interface TreeNode {
  name: string;
  fullPath: string;
  type: 'file' | 'directory';
  size?: number;
  mtime?: string;
  children?: { [key: string]: TreeNode };
  isExpanded?: boolean;
}

interface FileTreeBrowserProps {
  files: FileItem[];
  isLoading?: boolean;
}

export function FileTreeBrowser({ files, isLoading }: FileTreeBrowserProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure from flat file list
  const fileTree = useMemo(() => {
    const root: TreeNode = {
      name: 'root',
      fullPath: '',
      type: 'directory',
      children: {}
    };

    files.forEach(file => {
      const pathParts = file.path.split('/').filter(part => part.length > 0);
      let current = root;

      // Navigate through the path, creating directories as needed
      pathParts.forEach((part, index) => {
        if (!current.children) current.children = {};
        
        if (!current.children[part]) {
          const isLast = index === pathParts.length - 1;
          const fullPath = pathParts.slice(0, index + 1).join('/');
          
          current.children[part] = {
            name: part,
            fullPath,
            type: isLast && file.type !== 'd' ? 'file' : 'directory',
            size: isLast ? file.size : undefined,
            mtime: isLast ? file.mtime : undefined,
            children: isLast && file.type !== 'd' ? undefined : {}
          };
        }
        
        current = current.children[part];
      });
    });

    return root;
  }, [files]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.fullPath);
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const paddingLeft = `${depth * 20 + 8}px`;

    return (
      <div key={node.fullPath}>
        <div
          className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 cursor-pointer group"
          style={{ paddingLeft }}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(node.fullPath);
            }
          }}
        >
          <div className="flex items-center min-w-0 flex-1">
            {hasChildren && (
              <span className="mr-1 text-gray-400 text-xs">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {!hasChildren && <span className="mr-3"></span>}
            
            <span className="mr-2 text-gray-400">
              {node.type === 'directory' ? '📁' : getFileIcon(node.name)}
            </span>
            
            <span 
              className={`text-sm truncate ${
                node.type === 'directory' 
                  ? 'font-medium text-gray-900' 
                  : 'text-gray-800'
              }`}
              title={node.name}
            >
              {node.name}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500 ml-4">
            <span className="w-16 text-right">{formatSize(node.size)}</span>
            <span className="w-20 text-right">{formatDate(node.mtime)}</span>
          </div>
        </div>

        {hasChildren && isExpanded && node.children && (
          <div>
            {Object.values(node.children)
              .sort((a, b) => {
                // Directories first, then files
                if (a.type !== b.type) {
                  return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
              })
              .map(childNode => renderTreeNode(childNode, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return '📜';
      case 'json':
        return '📋';
      case 'md':
      case 'txt':
        return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return '🖼️';
      case 'pdf':
        return '📕';
      case 'zip':
      case 'tar':
      case 'gz':
        return '📦';
      case 'sh':
      case 'bash':
        return '⚡';
      case 'py':
        return '🐍';
      case 'html':
      case 'css':
        return '🌐';
      case 'sql':
        return '🗃️';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading contents...</span>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No files found in this archive
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider">
          <span>Name</span>
          <div className="flex items-center space-x-4">
            <span className="w-16 text-right">Size</span>
            <span className="w-20 text-right">Modified</span>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="max-h-96 overflow-y-auto">
        {fileTree.children && Object.values(fileTree.children)
          .sort((a, b) => {
            // Directories first, then files
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
          .map(node => renderTreeNode(node, 0))
        }
      </div>

      {/* Footer with file count */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {files.length.toLocaleString()} items total
        </span>
      </div>
    </div>
  );
}