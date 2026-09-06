/**
 * Compresses an uploaded image file using HTML5 Canvas.
 * Reduces raw 5-15MB photos down to ~30-60KB JPEGs so they fit
 * safely in localStorage and backend payload limits.
 */
export const compressImageFile = (
  file: File, 
  maxWidth = 1000, 
  maxHeight = 1000, 
  quality = 0.75
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = typeof e.target?.result === 'string' ? e.target.result : '';
      if (!src) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
};
