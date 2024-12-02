# SEO Analyser Extension / Tiện ích phân tích SEO 

This project is an SEO supporting extension. The extension is designed to analyse the content of the current tab, focusing on images and links, and provides functionalities for analysing and displaying statistics.

Dự án này là một tiện ích hỗ trợ SEO. Tiện ích được thiết kế để phân tích nội dung của tab hiện tại, tập trung vào hình ảnh và liên kết, và cung cấp các chức năng để phân tích và hiển thị số liệu thống kê.

## Project Structure / Cấu Trúc Dự Án

The project is organised into the following directories and files:
Dự án được tổ chức thành các thư mục và tệp sau:


  - `chromium_files/`
    - `background.js`
    - `content.js`
    - `manifest.json`
    - `popup.html`
    - `popup.js`

## Files Description / Chi tiết các tệp

- **background.js**

  Part of the Chrome extension and handles background events. It listens for the extension icon to be clicked, then executes the content script (`content.js`).

  Là một phần của tiện ích Chrome và xử lý các sự kiện nền. Nó lắng nghe khi biểu tượng tiện ích được nhấp, sau đó thực thi tập lệnh nội dung (`content.js`).

- **content.js**

  Runs in the context of the web page the user is viewing. It extracts image and link data from the page, formats it, and sends it to the Django backend via HTTP requests. It uses the DOM to select relevant elements and gathers their attributes.

  Chạy trong bối cảnh của trang web mà người dùng đang xem - trích xuất dữ liệu hình ảnh và liên kết từ trang, định dạng nó và gửi đến backend Django qua các yêu cầu HTTP. Nó sử dụng DOM để chọn các phần tử liên quan và thu thập các thuộc tính của chúng.

- **manifest.json**

  The configuration file for the Chrome extension. It defines the extension's metadata (name, version, permissions, etc.) and specifies which scripts to run in which contexts (background, content, popup).
  
  Tệp cấu hình cho tiện ích Chrome. Nó định nghĩa siêu dữ liệu của tiện ích (tên, phiên bản, quyền, v.v.) và chỉ định các tập lệnh nào sẽ chạy trong các ngữ cảnh nào (nền, nội dung, popup).

- **popup.html**

  Defines the HTML structure for the extension's popup interface. When the extension icon is clicked, this popup is displayed. It includes sections to display image and link data fetched from the Django backend.
  
  Định nghĩa cấu trúc HTML cho giao diện popup của tiện ích. Khi biểu tượng tiện ích được nhấp, popup này sẽ hiển thị. Nó bao gồm các phần để hiển thị dữ liệu hình ảnh và liên kết được lấy từ backend Django.

- **popup.js**

  Runs within the popup and fetches data from the Django backend to display in the popup interface. It makes HTTP requests to the endpoints defined in Django and updates the HTML content of the popup with the received data.
  
  Chạy trong popup và lấy dữ liệu từ backend Django để hiển thị trong giao diện popup. Nó thực hiện các yêu cầu HTTP đến các điểm cuối được định nghĩa trong Django và cập nhật nội dung HTML của popup với dữ liệu nhận được.

