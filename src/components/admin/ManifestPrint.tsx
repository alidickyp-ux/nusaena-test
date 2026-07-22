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
  courier_signature: string | null;
  security_signature: string | null;
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

const RESI_PER_PAGE = 80;
const RESI_COLS = 4;

export default function ManifestPrint({ manifest, historyLogs }: ManifestPrintProps) {
  const totalGood = historyLogs.filter(h => h.status === 'DONE').length;
  const totalCancel = historyLogs.filter(h => h.status === 'CANCELLED').length;
  const totalNotFound = historyLogs.filter(h => h.status === 'NOT_FOUND').length;
  const totalPaket = historyLogs.length;
  const statusLabel = manifest.total_discrepancy > 0 ? 'DISCREPANCY' : 'COMPLETED';

  const totalPages = Math.max(1, Math.ceil(historyLogs.length / RESI_PER_PAGE));

  const tanggalDibuat = manifest.signed_at
    ? new Date(manifest.signed_at).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '-';

  const jamHandover = manifest.signed_at
    ? new Date(manifest.signed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    : '-';

  const SignatureCard = ({
    label,
    name,
    signature,
  }: {
    label: string;
    name: string;
    signature: string | null;
  }) => (
    <div className="border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="h-20 flex items-center justify-center border border-dashed border-gray-300 rounded mb-2 overflow-hidden">
        {signature ? (
          <img src={signature} alt={`Tanda tangan ${label}`} className="max-h-20 object-contain" />
        ) : (
          <span className="text-xs text-gray-300">Belum tanda tangan</span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-800">{name}</p>
      <p className="text-xs text-blue-600">{tanggalDibuat}</p>
    </div>
  );

  return (
    <div className="bg-white">
      <style>{`
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          display: flex;
          flex-direction: column;
          page-break-after: always;
          font-family: Arial, sans-serif;
        }
        .print-page:last-child { page-break-after: auto; }
      `}</style>

      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;
        const pageItems = historyLogs.slice(
          pageIndex * RESI_PER_PAGE,
          (pageIndex + 1) * RESI_PER_PAGE
        );
        const itemsPerColumn = Math.ceil(pageItems.length / RESI_COLS) || 1;

        return (
          <div key={pageIndex} className="print-page">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold uppercase tracking-wide">Bukti Serah Terima</h1>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="font-mono font-bold text-blue-700">{manifest.session_code}</span>
              </div>
              {totalPages > 1 && (
                <p className="text-xs text-gray-400 mt-1">Halaman {pageIndex + 1} dari {totalPages}</p>
              )}
              <div className="border-b-2 border-gray-800 mt-3"></div>
            </div>

            {pageIndex === 0 && (
              <>
                {/* Info boxes */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-black-500 uppercase tracking-wide mb-2">
                      Informasi Operasional
                    </p>
                    <table className="text-sm w-full">
                      <tbody>
                        <tr>
                          <td className="text-s font-bold text-black-500 py-0.5 pr-2 align-top w-28">Tanggal</td>
                          <td className="font-semibold">{tanggalDibuat}</td>
                        </tr>
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top">Operator</td>
                          <td className="font-semibold">{manifest.operator_name}</td>
                        </tr>
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top">No. Sorting</td>
                          <td className="font-mono font-semibold">{manifest.session_code}</td>
                        </tr>
                        
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top">Jam Handover</td>
                          <td className="font-semibold">{jamHandover}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="border border-black-400 rounded-lg p-3">
                    <p className="text-xs font-bold text-black-500 uppercase tracking-wide mb-2">
                      Informasi Pengiriman
                    </p>
                    <table className="text-sm w-full">
                      <tbody>
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top">Transporter</td>
                          <td className="font-semibold">{manifest.transporter_name}</td>
                        </tr>
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top w-28">Kurir</td>
                          <td className="font-semibold">{manifest.courier_name}</td>
                        </tr>
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top">Security</td>
                          <td className="font-semibold">{manifest.security_name}</td>
                        </tr>
                        <tr>
                          <td className="text-s font-bold py-0.5 pr-2 align-top">No. Polisi</td>
                          <td className="font-semibold">{manifest.vehicle_number || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div className="border border-gray-200 rounded-lg py-2">
                    <p className="text-xl font-bold text-black-800">{totalPaket}</p>
                    <p className="text-xs text-black-500">Total Paket</p>
                  </div>
                  <div className="border border-emerald-200 bg-emerald-50 rounded-lg py-2">
                    <p className="text-xl font-bold text-emerald-600">{totalGood}</p>
                    <p className="text-xs text-blcak-500">Good</p>
                  </div>
                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg py-2">
                    <p className="text-xl font-bold text-yellow-600">{totalCancel}</p>
                    <p className="text-xs text-gray-500">Cancel</p>
                  </div>
                  <div className="border border-red-200 bg-red-50 rounded-lg py-2">
                    <p className="text-xl font-bold text-red-600">{totalNotFound}</p>
                    <p className="text-xs text-gray-500">Not Found</p>
                  </div>
                </div>
              </>
            )}

            {/* Tabel Resi - 4 kolom, cuma nomor resi + tanda kondisi (cancel/not found) */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: RESI_COLS }).map((_, colIndex) => {
                const colItems = pageItems.slice(
                  colIndex * itemsPerColumn,
                  (colIndex + 1) * itemsPerColumn
                );
                return (
                  <div key={colIndex} className="border border-gray-200 rounded overflow-hidden">
                    <div className="bg-gray-100 text-xs font-bold text-center py-1 text-gray-500">
                      AWB Number
                    </div>
                    <div className="divide-y divide-gray-100">
                      {colItems.map((item) => (
                        <div
                          key={item.id}
                          className={`px-2 py-1 text-xs font-mono flex justify-between items-center ${
                            item.status === 'DONE' ? 'bg-white'
                            : item.status === 'CANCELLED' ? 'bg-yellow-50'
                            : 'bg-red-50'
                          }`}
                        >
                          <span>{item.resi_number}</span>
                          {item.status !== 'DONE' && (
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                item.status === 'CANCELLED'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {item.status === 'CANCELLED' ? 'C' : 'NF'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer - Tanda Tangan (Kurir & Security saja), hanya di halaman terakhir, selalu mepet bawah halaman */}
            {isLastPage && (
              <div className="mt-auto pt-4">
                <div className="border-b-2 border-gray-800 mb-4"></div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Tanda Tangan
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <SignatureCard label="Kurir" name={manifest.courier_name} signature={manifest.courier_signature} />
                  <SignatureCard label="Security" name={manifest.security_name} signature={manifest.security_signature} />
                </div>
                <div className="border-t border-gray-200 mt-4 pt-2">
                  <p className="text-center text-xs text-gray-400">
                    Dokumen ini dicetak secara otomatis dari sistem | Dicetak: {new Date().toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}