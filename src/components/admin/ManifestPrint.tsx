"use client";

interface ManifestData {
  id: string;
  session_id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
  courier_name: string;
  security_name: string;
  vehicle_number: string;
  total_packages_handed: number;
  total_discrepancy: number;
  signed_at: string;
}

interface HistoryLog {
  id: string;
  resi_number: string;
  status: string;
  sorting_at: string;
  sorting_by: string;
  handover_at: string;
  handover_by: string;
}

interface ManifestPrintProps {
  manifest: ManifestData;
  historyLogs: HistoryLog[];
}

const ITEMS_PER_PAGE = 80;
const COLS = 4;

export default function ManifestPrint({ manifest, historyLogs }: ManifestPrintProps) {
  const totalGood = historyLogs.filter(h => h.status === 'DONE').length;
  const totalCancel = historyLogs.filter(h => h.status === 'CANCELLED').length;
  const totalNotFound = historyLogs.filter(h => h.status === 'NOT_FOUND').length;
  const totalPaket = historyLogs.length;
  const totalPages = Math.ceil(totalPaket / ITEMS_PER_PAGE);

  const getPageItems = (pageIndex: number) => {
    const start = pageIndex * ITEMS_PER_PAGE;
    return historyLogs.slice(start, start + ITEMS_PER_PAGE);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DONE': return { label: 'OK', color: 'green' };
      case 'CANCELLED': return { label: 'BTL', color: 'yellow' };
      case 'NOT_FOUND': return { label: 'NF', color: 'red' };
      default: return { label: '?', color: 'gray' };
    }
  };

  return (
    <div>
      {/* CSS untuk print */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .manifest-page {
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
          }
          .manifest-page:last-child {
            page-break-after: auto;
          }
          .no-print { display: none; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
        .manifest-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding: 20px;
          background: white;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
        }
        .resi-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        .resi-table th {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 2px 4px;
          text-align: center;
          font-weight: bold;
        }
        .resi-table td {
          border: 1px solid #d1d5db;
          padding: 1px 4px;
          font-family: monospace;
        }
        .status-ok { background: #d1fae5; color: #065f46; }
        .status-cancel { background: #fef3c7; color: #92400e; }
        .status-notfound { background: #fee2e2; color: #991b1b; }
        .status-unknown { background: #f3f4f6; color: #4b5563; }
        .signature-box {
          border-top: 2px solid #000;
          padding-top: 12px;
          margin-top: auto;
        }
        .signature-item {
          text-align: center;
        }
        .signature-line {
          border-bottom: 2px solid #9ca3af;
          height: 50px;
          margin-top: 4px;
        }
        .box-internal {
          border: 2px solid #93c5fd;
          background: #eff6ff;
          padding: 8px;
          border-radius: 4px;
        }
        .box-external {
          border: 2px solid #86efac;
          background: #f0fdf4;
          padding: 8px;
          border-radius: 4px;
        }
        .summary-box {
          background: #f3f4f6;
          padding: 6px 10px;
          border-radius: 4px;
          text-align: center;
        }
        .summary-number {
          font-size: 18px;
          font-weight: bold;
        }
        .badge {
          display: inline-block;
          padding: 0 6px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: bold;
        }
        .badge-ok { background: #d1fae5; color: #065f46; }
        .badge-cancel { background: #fef3c7; color: #92400e; }
        .badge-notfound { background: #fee2e2; color: #991b1b; }
      `}</style>

      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const pageItems = getPageItems(pageIndex);
        const isLastPage = pageIndex === totalPages - 1;
        const itemsPerCol = Math.ceil(pageItems.length / COLS);

        return (
          <div key={pageIndex} className="manifest-page">
            {/* HEADER */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                Bukti Serah Terima
              </h1>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                Handover Manifest
              </p>
              {totalPages > 1 && (
                <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                  Halaman {pageIndex + 1} dari {totalPages}
                </p>
              )}
            </div>

            {/* INFO SESSION - hanya halaman pertama */}
            {pageIndex === 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ border: '1px solid #d1d5db', padding: '8px', borderRadius: '4px' }}>
                    <p style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '10px', margin: '0 0 2px 0' }}>
                      Session ID
                    </p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 'bold', margin: 0 }}>
                      {manifest.session_code}
                    </p>
                    <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {new Date(manifest.signed_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div style={{ border: '1px solid #d1d5db', padding: '8px', borderRadius: '4px' }}>
                    <p style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '10px', margin: '0 0 2px 0' }}>
                      Transporter
                    </p>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{manifest.transporter_name}</p>
                    <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      Operator: {manifest.operator_name}
                    </p>
                  </div>
                </div>

                {/* BOX INTERNAL vs EKSTERNAL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="box-internal">
                    <p style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                      📋 Internal
                    </p>
                    <p style={{ margin: '1px 0', fontSize: '10px' }}>
                      <strong>Security:</strong> {manifest.security_name}
                    </p>
                    <p style={{ margin: '1px 0', fontSize: '10px' }}>
                      <strong>Operator:</strong> {manifest.operator_name}
                    </p>
                  </div>
                  <div className="box-external">
                    <p style={{ fontWeight: 'bold', color: '#065f46', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                      🚚 Eksternal / Kurir
                    </p>
                    <p style={{ margin: '1px 0', fontSize: '10px' }}>
                      <strong>Kurir:</strong> {manifest.courier_name}
                    </p>
                    <p style={{ margin: '1px 0', fontSize: '10px' }}>
                      <strong>Kendaraan:</strong> {manifest.vehicle_number}
                    </p>
                  </div>
                </div>

                {/* SUMMARY */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div className="summary-box">
                    <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>Total</p>
                    <p className="summary-number" style={{ margin: 0, color: '#1f2937' }}>{totalPaket}</p>
                  </div>
                  <div className="summary-box" style={{ background: '#d1fae5' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: '#065f46' }}>Good</p>
                    <p className="summary-number" style={{ margin: 0, color: '#065f46' }}>{totalGood}</p>
                  </div>
                  <div className="summary-box" style={{ background: '#fef3c7' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: '#92400e' }}>Cancel</p>
                    <p className="summary-number" style={{ margin: 0, color: '#92400e' }}>{totalCancel}</p>
                  </div>
                  <div className="summary-box" style={{ background: '#fee2e2' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: '#991b1b' }}>Not Found</p>
                    <p className="summary-number" style={{ margin: 0, color: '#991b1b' }}>{totalNotFound}</p>
                  </div>
                </div>
              </>
            )}

            {/* TABLE RESI - 4 KOLOM */}
            <table className="resi-table">
              <thead>
                <tr>
                  {Array.from({ length: COLS }).map((_, colIdx) => (
                    <th key={colIdx} style={{ width: '25%' }}>Kolom {colIdx + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: itemsPerCol }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {Array.from({ length: COLS }).map((_, colIdx) => {
                      const idx = colIdx * itemsPerCol + rowIdx;
                      const item = pageItems[idx];
                      if (!item) return <td key={colIdx}>&nbsp;</td>;
                      const status = getStatusLabel(item.status);
                      return (
                        <td key={colIdx} className={`status-${status.color}`}>
                          {item.resi_number}
                          <span className={`badge badge-${status.color}`} style={{ float: 'right' }}>
                            {status.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* FOOTER - TANDA TANGAN (hanya halaman terakhir, di-push ke bawah) */}
            {isLastPage && (
              <div className="signature-box">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div className="signature-item">
                    <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>Kurir</p>
                    <div className="signature-line"></div>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      {manifest.courier_name}
                    </p>
                  </div>
                  <div className="signature-item">
                    <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>Security</p>
                    <div className="signature-line"></div>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      {manifest.security_name}
                    </p>
                  </div>
                  <div className="signature-item">
                    <p style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>Operator</p>
                    <div className="signature-line"></div>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      {manifest.operator_name}
                    </p>
                  </div>
                </div>
                <p style={{ textAlign: 'center', fontSize: '9px', color: '#9ca3af', margin: '8px 0 0 0' }}>
                  Dicetak pada: {new Date().toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}