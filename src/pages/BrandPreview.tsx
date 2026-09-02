import { useRef, useState } from 'react';
import { ArrowRight, Check, ImagePlus, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

const fallbackAccent = '#c69214';

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function extractAccent(file: File) {
  return new Promise<string>((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 96;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (!context) {
          resolve(fallbackAccent);
          return;
        }

        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let weightTotal = 0;

        for (let index = 0; index < pixels.length; index += 16) {
          const currentRed = pixels[index];
          const currentGreen = pixels[index + 1];
          const currentBlue = pixels[index + 2];
          const max = Math.max(currentRed, currentGreen, currentBlue);
          const min = Math.min(currentRed, currentGreen, currentBlue);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = max / 255;

          if (saturation < 0.28 || brightness < 0.28 || brightness > 0.92) continue;

          const weight = saturation * brightness;
          red += currentRed * weight;
          green += currentGreen * weight;
          blue += currentBlue * weight;
          weightTotal += weight;
        }

        resolve(weightTotal > 0 ? rgbToHex(red / weightTotal, green / weightTotal, blue / weightTotal) : fallbackAccent);
      } catch {
        resolve(fallbackAccent);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(fallbackAccent);
    };

    image.src = objectUrl;
  });
}

export default function BrandPreview() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [accent, setAccent] = useState(fallbackAccent);
  const [advisorName, setAdvisorName] = useState('Gülşah Karakoç');
  const [officeName, setOfficeName] = useState('Trend Gayrimenkul');
  const [licenseNo, setLicenseNo] = useState('TTYB: 2600739');
  const [previewReady, setPreviewReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    if (logoUrl) URL.revokeObjectURL(logoUrl);
    const nextUrl = URL.createObjectURL(file);
    setLogoUrl(nextUrl);
    setAccent(await extractAccent(file));
    setPreviewReady(false);
  };

  const initials = officeName.trim().slice(0, 2).toLocaleUpperCase('tr-TR') || 'TE';
  const advisor = advisorName.trim() || 'Danışmanın';
  const office = officeName.trim() || 'Emlak Ofisin';

  return (
    <main className="min-h-screen bg-[#f8f6f0] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 font-bold text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-white shadow-sm" style={{ backgroundColor: accent }}>
              ✦
            </span>
            Trend Emlak Asistanı
          </a>
          <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm sm:block">
            Deneyim önizlemesi
          </span>
        </header>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
          <section>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: `${accent}1f`, color: accent }}>
              <Sparkles className="h-4 w-4" />
              Kendi markanı gör
            </div>
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Asistanın ilk bakışta <span style={{ color: accent }}>senin olsun.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              Kartvizitini veya logonu yükle. Renklerinle çalışan asistanını ve müşterinin telefonunda göreceği bildirimi anında önizle.
            </p>

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void handleFile(event.dataTransfer.files[0]);
              }}
              className="mt-7 flex w-full max-w-xl items-center gap-4 rounded-2xl border-2 border-dashed bg-white p-5 text-left transition sm:p-6"
              style={{ borderColor: dragging ? accent : '#d9dce3', boxShadow: dragging ? `0 0 0 4px ${accent}1f` : undefined }}
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                {logoUrl ? <Check className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
              </span>
              <span>
                <span className="block font-bold text-slate-800">
                  {logoUrl ? 'Kartvizitin eklendi' : 'Kurumsal kartvizitini veya logonu buraya sürükle'}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {logoUrl ? 'Renklerin telefon önizlemesine uygulandı.' : 'PNG, JPG veya WEBP · Bu önizlemede görselin tarayıcından ayrılmaz.'}
                </span>
              </span>
            </button>

            <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Danışman adı</span>
                <input value={advisorName} onChange={(event) => setAdvisorName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as React.CSSProperties} />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Ofis adı</span>
                <input value={officeName} onChange={(event) => setOfficeName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as React.CSSProperties} />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">TTYB numarası</span>
                <input value={licenseNo} onChange={(event) => setLicenseNo(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as React.CSSProperties} />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setPreviewReady(true)}
              className="mt-6 inline-flex w-full max-w-xl items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white shadow-sm transition hover:brightness-95"
              style={{ backgroundColor: accent }}
            >
              <MessageCircle className="h-5 w-5" />
              Kendime test mesajı önizlemesi oluştur
              <ArrowRight className="h-4 w-4" />
            </button>

            {previewReady && (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" />
                Önizleme sağdaki telefonda hazır. Gerçek WhatsApp mesajı gönderilmedi.
              </p>
            )}
          </section>

          <section className="mx-auto w-full max-w-[360px]">
            <div className="rounded-[3rem] bg-slate-950 p-3 shadow-2xl ring-8 ring-slate-900/10">
              <div className="overflow-hidden rounded-[2.3rem] bg-[#efeae2]">
                <div className="flex items-center justify-between bg-slate-950 px-7 pb-2 pt-3 text-[10px] font-semibold text-white">
                  <span>09:41</span>
                  <span className="h-4 w-20 rounded-full bg-black" />
                  <span>●●●</span>
                </div>
                <div className="min-h-[610px]">
                  <div className="flex items-center gap-3 px-4 py-4 text-white" style={{ backgroundColor: accent }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="h-10 w-10 rounded-full border border-white/40 object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-black">{initials}</span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{office}</p>
                      <p className="text-xs text-white/80">{licenseNo || 'Yetki belgesi'}</p>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="mb-4 text-center text-[11px] text-slate-400">Bugün</p>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yeni müşteri eşleşmesi</p>
                          <p className="mt-1 font-bold text-slate-900">Çamlıca’da 3+1 aile dairesi</p>
                          <p className="mt-1 text-sm text-slate-600">Bütçe ve konum tercihiyle güçlü eşleşme bulundu.</p>
                        </div>
                        <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: `${accent}1f`, color: accent }}>%100</span>
                      </div>
                      <button type="button" className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accent }}>
                        Hemen ara
                      </button>
                    </div>

                    <div className="ml-auto mt-6 max-w-[88%] rounded-2xl rounded-br-sm bg-[#d9fdd3] px-4 py-3 text-sm text-slate-800 shadow-sm">
                      Merhaba {advisor}, müşterin için uygun bir ilan bulundu. Asistanın seni aramaya hazır.
                      <span className="mt-2 block text-right text-[10px] text-slate-400">09:41 ✓✓</span>
                    </div>
                  </div>

                  <div className="mx-4 mt-5 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs text-slate-400 shadow-sm">
                    <ShieldCheck className="h-4 w-4" style={{ color: accent }} />
                    Bu ekran yalnız markalı mesaj önizlemesidir.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
