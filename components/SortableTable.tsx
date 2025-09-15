import React, { useState, useMemo, useCallback } from 'react';

interface TableData {
  id: number;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

interface SortConfig {
  key: keyof TableData;
  direction: 'asc' | 'desc';
}

interface SortableTableProps {
  data: TableData[];
  onRowClick?: (row: TableData) => void;
}

const SortableTable: React.FC<SortableTableProps> = ({ data, onRowClick }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Filtering logic
  const filteredData = useMemo(() => {
    return sortedData.filter(item => {
      const matchesText = item.name.toLowerCase().includes(filterText.toLowerCase()) ||
                         item.email.toLowerCase().includes(filterText.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [sortedData, filterText, statusFilter]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Event handlers
  const handleSort = useCallback((key: keyof TableData) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handleFilterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const handleStatusFilterChange = useCallback((status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const validateTableData = useCallback((data: TableData[]) => {
    return data.every(item => 
      item.id && 
      item.name && 
      item.email && 
      typeof item.age === 'number' &&
      ['active', 'inactive'].includes(item.status)
    );
  }, []);

  // Search functionality
  const searchInData = useCallback((searchTerm: string) => {
    if (!searchTerm) return data;
    
    return data.filter(item => 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data]);

  // Data processing utilities
  const processDataForExport = useCallback(() => {
    return filteredData.map(item => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      displayName: `${item.name} (${item.email})`
    }));
  }, [filteredData]);

  const transformDataForChart = useCallback(() => {
    const statusCounts = filteredData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count
    }));
  }, [filteredData]);

  return (
    <div className="sortable-table">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={filterText}
          onChange={handleFilterChange}
          className="search-input"
        />
        
        <div className="status-filters">
          {(['all', 'active', 'inactive'] as const).map(status => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            {(['name', 'email', 'age', 'status', 'createdAt'] as const).map(column => (
              <th key={column} onClick={() => handleSort(column)} className="sortable-header">
                {column.charAt(0).toUpperCase() + column.slice(1)}
                {sortConfig?.key === column && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(row => (
            <tr key={row.id} onClick={() => onRowClick?.(row)} className="table-row">
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.age}</td>
              <td>
                <span className={`status-badge ${row.status}`}>
                  {row.status}
                </span>
              </td>
              <td>{row.createdAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span className="page-info">
          Page {currentPage} of {totalPages} ({filteredData.length} items)
        </span>
        
        <button 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SortableTable;