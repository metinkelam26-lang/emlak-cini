import { useState, useRef } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type PhotoUploadProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
};

export default function PhotoUpload({ photos, onChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    const uploadedUrls: string[] = [];
    let failedUploads = 0;

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const filePath = `ilanlar/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('ilan-fotograflari')
          .upload(filePath, file);

        if (uploadError) {
          failedUploads += 1;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('ilan-fotograflari')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        onChange([...photos, ...uploadedUrls]);
      }
      if (failedUploads > 0) {
        setError('Bazı fotoğraflar yüklenemedi. Lütfen tekrar deneyin.');
      } else if (uploadedUrls.length === 0) {
        setError('Yüklemek için geçerli bir görsel dosyası seçin.');
      }
    } catch {
      setError('Fotoğraf yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (index: number) => {
    const photoPath = photos[index];
    const newPath = photoPath.split('/').slice(-2).join('/');

    setError(null);
    const { error: removeError } = await supabase.storage
      .from('ilan-fotograflari')
      .remove([newPath]);
    if (removeError) {
      setError('Fotoğraf depolamadan silinemedi.');
      return;
    }

    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Fotoğraflar</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {photos.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
          >
            <img src={url} alt={`Fotoğraf ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:bg-red-600 transition"
              aria-label="Fotoğrafı sil"
            >
              <X className="w-4 h-4" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
                Kapak
              </span>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs font-medium">Fotoğraf Ekle</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <p className="mt-2 text-xs text-gray-400">
        Bilgisayarınızdan veya telefonunuzdan fotoğraf seçin. Birden fazla fotoğraf ekleyebilirsiniz.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
