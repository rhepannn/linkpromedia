interface Props {
  /** Berapa kartu bayangan yang ditampilkan selagi data diambil */
  jumlah?: number;
}

/**
 * Kerangka kartu selagi data dimuat.
 *
 * Menggantikan teks "Memuat..." yang tingginya jauh lebih pendek daripada
 * isi sebenarnya — begitu data tiba, halaman melompat dan pembaca kehilangan
 * posisi bacanya. Kerangka ini memakai bentuk dan rasio yang sama dengan
 * kartu asli, jadi ruangnya sudah dipesan sejak awal.
 */
export default function KerangkaKartu({ jumlah = 6 }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
      {Array.from({ length: jumlah }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-divider bg-white">
          <div className="aspect-[16/10] bg-gray-100 animate-pulse" />
          <div className="p-4 space-y-2.5">
            <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
