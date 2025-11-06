import React from 'react';
import { useParent } from '../../context/ParentContext';

function ParentSelector() {
  const { selectedParent, parentCompanies, loading, selectParent } = useParent();

  if (loading) {
    return (
      <div style={{color: '#94a3b8', fontSize: '14px'}}>
        Loading parent companies...
      </div>
    );
  }

  if (!parentCompanies || parentCompanies.length === 0) {
    return (
      <div style={{color: '#94a3b8', fontSize: '14px'}}>
        No parent company
      </div>
    );
  }

  return (
    <div style={{marginBottom: '20px'}}>
      <label style={{display: 'block', marginBottom: '8px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
        Parent Company:
      </label>
      <select
        value={selectedParent?.id || ''}
        onChange={(e) => {
          const parent = parentCompanies.find(p => p.id === e.target.value);
          if (parent) {
            selectParent(parent);
          }
        }}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#334155',
          color: 'white',
          border: '2px solid #475569',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        {parentCompanies.map(parent => (
          <option key={parent.id} value={parent.id}>
            🏢 {parent.name} ({parent.member_count} members)
          </option>
        ))}
      </select>

      {selectedParent && (
        <div style={{marginTop: '8px', fontSize: '12px', color: '#cbd5e1'}}>
          {selectedParent.legal_name || selectedParent.name}
          {' • '}
          {selectedParent.accounting_standard || 'GAAP'}
        </div>
      )}
    </div>
  );
}

export default ParentSelector;
