MicroSIP shu papkaga joylanadi.

1. MicroSIP'ning PORTABLE versiyasini yuklab oling (microsip.org).
2. Ichidagi fayllarni (microsip.exe va boshqalar) shu "microsip" papkasiga
   ko'chiring. Natijada quyidagicha bo'lishi kerak:
       src-tauri/microsip/microsip.exe
       src-tauri/microsip/...

Build paytida bu papka .exe ichiga bundle qilinadi (resources).
Ilova ochilganda MicroSIP avtomatik ishga tushadi.

Eslatma: .exe / .dll fayllar git'ga qo'shilmaydi (.gitignore). Build
qiladigan kompyuterda yoki CI'da bu fayllar mavjud bo'lishi kerak.
