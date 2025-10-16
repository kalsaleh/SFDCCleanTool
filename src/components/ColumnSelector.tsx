import React from 'react';
import { Check, Database, Search } from 'lucide-react';

interface ColumnSelectorProps {
  columns: string[];
  selectedColumns: string[];
  onColumnToggle: (column: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  selectedColumns,
  onColumnToggle,
  onSelectAll,
  onClearAll
}) => {
  console.log('ColumnSelector - columns:', columns);
  console.log('ColumnSelector - selectedColumns:', selectedColumns);
  const getColumnType = (column: string): 'name' | 'address' | 'contact' | 'other' => {
    const col = column.toLowerCase();
    if (col.includes('name') || col.includes('company') || col.includes('account')) return 'name';
    if (col.includes('address') || col.includes('street') || col.includes('city') || col.includes('state') || col.includes('country')) return 'address';
    if (col.includes('email') || col.includes('phone') || col.includes('contact')) return 'contact';
    return 'other';
  };

  const getColumnIcon = (type: string) => {
    switch (type) {
      case 'name': return <Database className="h-4 w-4" />;
      case 'address': return <Search className="h-4 w-4" />;
      default: return <Check className="h-4 w-4" />;
    }
  };

  const getColumnColor = (type: string) => {
    switch (type) {
      case 'name': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'address': return 'text-green-600 bg-green-50 border-green-200';
      case 'contact': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const groupedColumns = React.useMemo(() => {
    const grouped = columns.reduce((acc, column) => {
      const type = getColumnType(column);
      if (!acc[type]) acc[type] = [];
      acc[type].push(column);
      return acc;
    }, {} as Record<string, string[]>);
    console.log('Grouped columns:', grouped);
    return grouped;
  }, [columns]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Select Columns for Matching</span>
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={onClearAll}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedColumns).map(([type, cols]) => (
          <div key={type} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 capitalize flex items-center space-x-1">
              {getColumnIcon(type)}
              <span>{type} Fields</span>
            </h4>
            <div className="space-y-1">
              {cols.map((column) => (
                <label
                  key={column}
                  className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                    selectedColumns.includes(column)
                      ? getColumnColor(getColumnType(column))
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => onColumnToggle(column)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium truncate" title={column}>
                    {column}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>Tip:</strong> Select columns that are most likely to contain duplicate information. 
          Company names and addresses are typically the most effective for duplicate detection.
        </p>
      </div>
    </div>
  );
};