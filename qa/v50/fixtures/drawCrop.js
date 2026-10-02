'use client';
const defaultCrop = { aspect: '4:3', zoom: 1, x: 0, y: 0, rotation: 0, flipX: false, flipY: false, brightness: 100, contrast: 100 };
const cropRatios = { '4:3': 4 / 3, '1:1': 1, '3:4': 3 / 4, '16:9': 16 / 9 };
const ratio = (s, image) => s.aspect === 'original' ? (s.rotation % 180 ? image.naturalHeight / image.naturalWidth : image.naturalWidth / image.naturalHeight) : (cropRatios[s.aspect] || 4 / 3);
function drawCrop(canvas, image, s, width = 900) {
    const height = Math.round(width / ratio(s, image));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Your browser cannot open the image editor.');
    const sideways = s.rotation % 180 !== 0, iw = sideways ? image.naturalHeight : image.naturalWidth, ih = sideways ? image.naturalWidth : image.naturalHeight;
    const scale = Math.max(width / iw, height / ih) * s.zoom, dx = Math.max(0, (iw * scale - width) / 2) * s.x / 100, dy = Math.max(0, (ih * scale - height) / 2) * s.y / 100;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + dx, height / 2 + dy);
    ctx.scale(scale, scale);
    ctx.rotate(s.rotation * Math.PI / 180);
    ctx.scale(s.flipX ? -1 : 1, s.flipY ? -1 : 1);
    ctx.filter = `brightness(${s.brightness}%) contrast(${s.contrast}%)`;
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.restore();
}
