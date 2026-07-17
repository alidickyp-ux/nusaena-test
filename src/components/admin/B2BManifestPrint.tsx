"use client";

interface ManifestData {
  id: string;
  delivery_number: string;
  vendor_name: string;
  total_box: number;
  total_weight: string;
  delivered_status: string;
  loading_date: string;
  arrive_date: string | null;
  resi_number: string | null;
  reference_price: string | null;
  cost: string;
  ppn: string;
}

interface DetailRow {
  reference: string;
  box_id: string;
  box_number: string;
  weight: string;
  site: string;
  staging_location: string;
  store_name: string;
  loading_status: string;
  driver: string | null;
  operator: string | null;
  security: string | null;
  police_number: string | null;
  driver_sign: string | null;
  security_sign: string | null;
  putaway_at: string;
  loading_at: string | null;
}

interface B2BManifestPrintProps {
  manifest: ManifestData;
  details: DetailRow[];
}

const BOX_PER_PAGE = 60;

export default function B2BManifestPrint({ manifest, details }: B2BManifestPrintProps) {
  const totalPages = Math.max(1, Math.ceil(details.length / BOX_PER_PAGE));

  // Ambil driver/operator/security/police_number dari baris pertama yang punya data —
  // semua box dalam satu DN Number di-handover bersamaan jadi datanya seragam.
  const headerInfo = details.find((d) => d.driver) || details[0];

  const tanggalLoading = manifest.loading_date
    ? new Date(manifest.loading_date).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const references = Array.from(new Set(details.map((d) => d.reference)));

  const SignatureCard = ({
    label,
    name,
    signature,
  }: {
    label: string;
    name: string | null;
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
      <p className="text-sm font-semibold text-gray-800">{name || "-"}</p>
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
        const pageItems = details.slice(
          pageIndex * BOX_PER_PAGE,
          (pageIndex + 1) * BOX_PER_PAGE
        );

        return (
          <div key={pageIndex} className="print-page">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold uppercase tracking-wide">Surat Jalan B2B</h1>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="font-mono font-bold text-blue-700">
                  {manifest.delivery_number}
                </span>
              </div>
              {totalPages > 1 && (
                <p className="text-xs text-gray-400 mt-1">
                  Halaman {pageIndex + 1} dari {totalPages}
                </p>
              )}
              <div className="border-b-2 border-gray-800 mt-3"></div>
            </div>

            {pageIndex === 0 && (
              <>
                {/* Info boxes */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Informasi Pengiriman
                    </p>
                    <table className="text-sm w-full">
                      <tbody>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top w-32">Tanggal Loading</td>
                          <td className="font-semibold">{tanggalLoading}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">Vendor</td>
                          <td className="font-semibold">{manifest.vendor_name}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">Reference</td>
                          <td className="font-mono font-semibold">{references.join(", ")}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">No. Resi</td>
                          <td className="font-mono font-semibold">
                            {manifest.resi_number || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">Total Box</td>
                          <td className="font-semibold">{manifest.total_box}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">Total Berat</td>
                          <td className="font-semibold">
                            {Number(manifest.total_weight).toLocaleString("id-ID")} kg
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Informasi Kendaraan
                    </p>
                    <table className="text-sm w-full">
                      <tbody>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top w-28">Driver</td>
                          <td className="font-semibold">{headerInfo?.driver || "-"}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">Operator</td>
                          <td className="font-semibold">{headerInfo?.operator || "-"}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">Security</td>
                          <td className="font-semibold">{headerInfo?.security || "-"}</td>
                        </tr>
                        <tr>
                          <td className="text-gray-500 py-0.5 pr-2 align-top">No. Polisi</td>
                          <td className="font-semibold">{headerInfo?.police_number || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Tabel Box */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-2 py-1 text-left">Reference</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Box ID</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Berat (kg)</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Toko</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d) => (
                  <tr key={d.box_id}>
                    <td className="border border-gray-200 px-2 py-1 font-mono">{d.reference}</td>
                    <td className="border border-gray-200 px-2 py-1 font-mono">{d.box_id}</td>
                    <td className="border border-gray-200 px-2 py-1">{d.weight}</td>
                    <td className="border border-gray-200 px-2 py-1">{d.store_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer - Tanda Tangan, hanya di halaman terakhir */}
            {isLastPage && (
              <div className="mt-auto pt-4">
                <div className="border-b-2 border-gray-800 mb-4"></div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Tanda Tangan
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <SignatureCard
                    label="Driver"
                    name={headerInfo?.driver || null}
                    signature={headerInfo?.driver_sign || null}
                  />
                  <SignatureCard
                    label="Security"
                    name={headerInfo?.security || null}
                    signature={headerInfo?.security_sign || null}
                  />
                </div>
                <div className="border-t border-gray-200 mt-4 pt-2">
                  <p className="text-center text-xs text-gray-400">
                    Dokumen ini dicetak secara otomatis dari sistem WMS | Dicetak:{" "}
                    {new Date().toLocaleString("id-ID")}
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