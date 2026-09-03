# Deploy TaskGenie lên Google Cloud Run

Hướng dẫn từng bước, chạy trên macOS. Làm đúng thứ tự — bước sau phụ thuộc bước trước.

**Kiến trúc**

```
Người dùng
   │
   ├─→ taskgenie-web  (Cloud Run)  nginx phục vụ file tĩnh
   │        │
   │        └─→ gọi API qua HTTPS
   │
   └─→ taskgenie-api  (Cloud Run)  ASP.NET Core
            │
            └─→ Cloud SQL for SQL Server (kết nối qua Unix socket /cloudsql)
```

**Chi phí ước tính**: Cloud Run gần như miễn phí ở mức tải demo. Cloud SQL for SQL Server
khoảng **$45–60/tháng** và chạy 24/7 — đây là khoản tốn tiền duy nhất đáng kể. Credit $300
dùng được khoảng 5 tháng.

**Thời gian**: khoảng 45–60 phút, phần lớn là chờ Cloud SQL khởi tạo (~10 phút).

---

## Bước 0 — Cài gcloud CLI

```bash
brew install --cask google-cloud-sdk
```

Cài xong, mở terminal mới rồi kiểm tra:

```bash
gcloud --version
```

Nếu báo `command not found`, thêm dòng này vào `~/.zshrc` rồi mở lại terminal:

```bash
source "$(brew --prefix)/share/google-cloud-sdk/path.zsh.inc"
```

---

## Bước 1 — Đăng nhập và tạo project

```bash
gcloud auth login
```

Trình duyệt mở ra, chọn tài khoản Google có credit $300.

```bash
gcloud projects create taskgenie-prod --name="TaskGenie"
gcloud config set project taskgenie-prod
```

> Tên project phải **duy nhất toàn cầu**. Nếu báo trùng, đổi thành `taskgenie-prod-<tên bạn>`
> và nhớ dùng tên đó cho mọi lệnh sau.

**Gắn tài khoản thanh toán** — bắt buộc, không làm thì mọi lệnh sau đều lỗi:

1. Mở https://console.cloud.google.com/billing
2. Chọn tài khoản có credit $300
3. Vào **Account management** → **Link a project** → chọn `taskgenie-prod`

Kiểm tra đã gắn thành công:

```bash
gcloud beta billing projects describe taskgenie-prod
```

Phải thấy `billingEnabled: true`.

---

## Bước 2 — Bật các dịch vụ cần dùng

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

Mất khoảng 1–2 phút.

---

## Bước 3 — Tạo kho chứa Docker image

```bash
gcloud artifacts repositories create taskgenie \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="TaskGenie container images"
```

`asia-southeast1` là Singapore — vùng gần Việt Nam nhất, độ trễ thấp nhất.
**Dùng đúng vùng này cho tất cả các bước sau.**

---

## Bước 4 — Tạo Cloud SQL for SQL Server

Đặt mật khẩu mạnh trước (đừng dùng lại mật khẩu Docker local):

```bash
read -s -p "Mật khẩu SQL Server: " DB_PASSWORD; echo
```

```bash
gcloud sql instances create taskgenie-db \
  --database-version=SQLSERVER_2022_EXPRESS \
  --tier=db-custom-1-3840 \
  --region=asia-southeast1 \
  --root-password="$DB_PASSWORD" \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=19:00
```

**Bước này mất khoảng 10 phút.** Cứ để chạy.

Tạo database:

```bash
gcloud sql databases create ai_task_management --instance=taskgenie-db
```

Lấy connection name (dùng ở bước sau):

```bash
gcloud sql instances describe taskgenie-db --format='value(connectionName)'
```

Kết quả dạng `taskgenie-prod:asia-southeast1:taskgenie-db`.

---

## Bước 5 — Cất secret vào Secret Manager

Không bao giờ đưa các giá trị này vào biến môi trường thường hay vào git.

```bash
INSTANCE=$(gcloud sql instances describe taskgenie-db --format='value(connectionName)')

# Chuỗi kết nối — API nói chuyện với Cloud SQL qua Unix socket, không qua TCP
printf 'Server=/cloudsql/%s;Database=ai_task_management;User Id=sqlserver;Password=%s;TrustServerCertificate=True' \
  "$INSTANCE" "$DB_PASSWORD" | gcloud secrets create db-connection --data-file=-

# JWT secret sinh ngẫu nhiên
openssl rand -base64 48 | gcloud secrets create jwt-secret --data-file=-
```

**Key PayOS** — dùng key MỚI, 3 key cũ đã lộ nên cần rotate trong dashboard PayOS trước:

```bash
printf '<payos-client-id-moi>'    | gcloud secrets create payos-client-id --data-file=-
printf '<payos-api-key-moi>'      | gcloud secrets create payos-api-key --data-file=-
printf '<payos-checksum-key-moi>' | gcloud secrets create payos-checksum-key --data-file=-
```

Các key tuỳ chọn (bỏ qua nếu chưa dùng):

```bash
printf '<huggingface-key>'   | gcloud secrets create huggingface-key --data-file=-
printf '<google-client-id>'  | gcloud secrets create google-client-id --data-file=-
```

Kiểm tra:

```bash
gcloud secrets list
```

---

## Bước 6 — Service account cho GitHub Actions

```bash
PROJECT=taskgenie-prod
gcloud iam service-accounts create github-deploy \
  --display-name="GitHub Actions deploy"

SA="github-deploy@$PROJECT.iam.gserviceaccount.com"

for role in \
  run.admin \
  artifactregistry.writer \
  cloudsql.client \
  secretmanager.secretAccessor \
  iam.serviceAccountUser
do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member="serviceAccount:$SA" --role="roles/$role" --quiet
done
```

Đây là **quyền tối thiểu** đủ để deploy: đẩy image, tạo/sửa service Cloud Run, đọc secret,
kết nối Cloud SQL. Không có quyền xoá project hay sửa billing.

Tạo khoá:

```bash
gcloud iam service-accounts keys create key.json --iam-account=$SA
cat key.json
```

---

## Bước 7 — Nạp secret vào GitHub

Vào repo trên GitHub → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**, tạo 2 secret:

| Tên | Giá trị |
|---|---|
| `GCP_SA_KEY` | Dán **toàn bộ** nội dung `key.json` (cả dấu ngoặc nhọn) |
| `GCP_PROJECT_ID` | `taskgenie-prod` |

Xong thì **xoá khoá khỏi máy** — nó mở được toàn bộ project:

```bash
rm key.json
```

---

## Bước 8 — Cho Cloud Run quyền đọc secret

Cloud Run chạy bằng service account mặc định của Compute Engine. Cấp cho nó quyền đọc secret
và kết nối database:

```bash
PROJECT_NUMBER=$(gcloud projects describe taskgenie-prod --format='value(projectNumber)')
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding taskgenie-prod \
  --member="serviceAccount:$RUNTIME_SA" \
  --role="roles/secretmanager.secretAccessor" --quiet

gcloud projects add-iam-policy-binding taskgenie-prod \
  --member="serviceAccount:$RUNTIME_SA" \
  --role="roles/cloudsql.client" --quiet
```

---

## Bước 9 — Chạy migration lên Cloud SQL

Database vừa tạo đang **trống**. Phải tạo bảng trước lần deploy đầu.

Mở một terminal riêng, chạy proxy:

```bash
gcloud components install cloud-sql-proxy
cloud-sql-proxy --port 1434 $(gcloud sql instances describe taskgenie-db --format='value(connectionName)')
```

Để nguyên terminal đó. Ở terminal khác, tại thư mục repo:

```bash
cd /Users/jronehuynh/Downloads/TaskGenieV2-main

ConnectionStrings__DefaultConnection="Server=127.0.0.1,1434;Database=ai_task_management;User Id=sqlserver;Password=$DB_PASSWORD;TrustServerCertificate=True;Encrypt=False" \
Payments__UseFakeProvider=true \
Jwt__Secret="tam-thoi-chi-de-chay-migration-32-ky-tu" \
dotnet ef database update --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
```

Thấy `Done.` là xong. Tắt proxy (Ctrl+C).

> **Tài khoản admin**: `admin@gmail.com` / `123456` **không được tạo trên Production** — mật khẩu
> nằm trong mã nguồn nên tạo ở đó là công khai một tài khoản quản trị. Trên production, đăng ký
> một tài khoản thật qua giao diện, rồi đặt biến `Bootstrap__PlatformAdminEmail` bằng email đó để
> nâng nó lên quản trị viên.

---

## Bước 10 — Deploy

Sau khi bước 1–9 xong, push nhánh `production`:

```bash
git push origin production
```

Workflow `.github/workflows/deploy.yml` sẽ tự động:

1. Build image API → đẩy lên Artifact Registry
2. Deploy `taskgenie-api` lên Cloud Run, gắn Cloud SQL và secret
3. **Đọc URL của API vừa deploy**
4. Build image web **với URL đó nhúng vào** (Vite nhúng lúc build, không đổi được lúc chạy)
5. Deploy `taskgenie-web`

Thứ tự này bắt buộc: web không thể build trước khi biết API ở đâu.

Xem tiến trình ở tab **Actions** trên GitHub.

---

## Sau khi deploy xong

Lấy URL:

```bash
gcloud run services list --region=asia-southeast1 --format='table(SERVICE,URL)'
```

**Cấu hình webhook PayOS**: vào dashboard PayOS, đặt Webhook URL thành:

```
https://<url-api>/api/webhooks/payos
```

Khác với lúc test bằng cloudflared, URL này **cố định vĩnh viễn**, không chết khi tắt máy.

---

## Xử lý sự cố

**Service báo lỗi 500 ngay khi mở**
```bash
gcloud run services logs read taskgenie-api --region=asia-southeast1 --limit=50
```
Thường là chuỗi kết nối sai hoặc chưa chạy migration (bước 9).

**Web mở được nhưng không gọi được API**
Mở DevTools → Network. Nếu request đi tới `localhost:5258` thì image web đã build với URL sai —
chạy lại workflow để build lại.

**PayOS webhook trả 401**
Kiểm tra secret `payos-checksum-key` khớp với key trong dashboard PayOS. Đường dẫn phải là
`/api/webhooks/payos`, không phải `/api/payos-webhook`.

---

## Kiểm soát chi phí

Đặt cảnh báo ngân sách để không đốt hết credit lúc nào không hay:

```bash
gcloud billing budgets create \
  --billing-account=$(gcloud beta billing projects describe taskgenie-prod --format='value(billingAccountName)' | sed 's|.*/||') \
  --display-name="TaskGenie budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

Khi không demo, **tắt Cloud SQL** để tiết kiệm (chỉ còn tiền lưu trữ ~$2/tháng):

```bash
gcloud sql instances patch taskgenie-db --activation-policy=NEVER   # tắt
gcloud sql instances patch taskgenie-db --activation-policy=ALWAYS  # bật lại
```

Bật lại mất khoảng 2 phút. Cloud Run tự scale về 0 nên không cần tắt.
