export const extractDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0;
        let count = 0;
        // Sample every 40th pixel (10px jumps) to save processing
        for (let i = 0; i < data.length; i += 40) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        // Darken the average color slightly to ensure white text remains readable
        r = Math.floor((r / count) * 0.6);
        g = Math.floor((g / count) * 0.6);
        b = Math.floor((b / count) * 0.6);
        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        resolve('rgb(24, 24, 24)'); // Default fallback
      }
    };
    img.onerror = () => resolve('rgb(24, 24, 24)');
    img.src = imageUrl;
  });
};
