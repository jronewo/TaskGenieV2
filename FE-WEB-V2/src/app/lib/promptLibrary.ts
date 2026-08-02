/**
 * Suggested prompts, grouped so the chat box can offer a browsable list instead of a blank input.
 *
 * Every entry must map to something the agent can actually do — a suggestion the assistant then
 * refuses is worse than no suggestion, because the user spent one of their per-minute turns on it.
 * The test file asserts that, so a prompt for a feature nobody built cannot slip in.
 */

export interface PromptGroup {
  id: string;
  title: string;
  /** Why these questions are worth asking. */
  hint: string;
  prompts: string[];
}

export const PROMPT_LIBRARY: PromptGroup[] = [
  {
    id: "overview",
    title: "Tổng quan",
    hint: "Nắm tình hình nhanh trước khi đi vào chi tiết.",
    prompts: [
      "Cho tôi tổng quan dự án này",
      "Tình hình dự án đang thế nào?",
      "Báo cáo tiến độ hiện tại",
      "Dự án này còn bao nhiêu việc chưa xong?",
      "Tỷ lệ hoàn thành của dự án là bao nhiêu?",
      "Tổng quan công việc của tôi",
      "Có bao nhiêu task đang mở?",
      "So sánh số task đã xong và chưa xong",
    ],
  },
  {
    id: "risk",
    title: "Rủi ro",
    hint: "Tìm việc có nguy cơ trượt trước khi nó trượt thật.",
    prompts: [
      "Task nào đang rủi ro cao?",
      "Tính toán risk estimate cho dự án này",
      "Liệt kê task ở mức HIGH và CRITICAL",
      "Có bao nhiêu task rủi ro cao chưa được giao?",
      "Task rủi ro nào sắp đến hạn?",
      "Vì sao task này bị đánh giá rủi ro cao?",
      "Dự án nào của tôi đang rủi ro nhất?",
      "Chạy phân tích rủi ro cho task số 12",
    ],
  },
  {
    id: "deadline",
    title: "Hạn chót",
    hint: "Việc sắp tới hạn và việc đã trễ.",
    prompts: [
      "Task nào sắp đến hạn?",
      "Việc nào đến hạn trong 5 ngày tới?",
      "Task nào đã quá hạn?",
      "Có việc nào trễ deadline không?",
      "Liệt kê task đến hạn trong tuần này",
      "Task quá hạn nào chưa có người làm?",
      "Task nào chưa đặt deadline?",
      "Việc trễ hạn lâu nhất là việc nào?",
    ],
  },
  {
    id: "staffing",
    title: "Phân công",
    hint: "Ai đang làm gì, và việc nào chưa có ai.",
    prompts: [
      "Task nào chưa được assign?",
      "Có bao nhiêu việc chưa giao cho ai?",
      "Gợi ý người phù hợp cho task số 8",
      "Giao task số 8 cho người phù hợp nhất",
      "Ai đang gánh nhiều việc nhất?",
      "Task rủi ro cao nào chưa có người nhận?",
      "Phân công task đang trễ hạn cho ai đó",
      "Liệt kê task đã có người làm rồi",
    ],
  },
  {
    id: "progress",
    title: "Tiến độ",
    hint: "Trạng thái hiện tại và cập nhật trạng thái.",
    prompts: [
      "Hôm nay đang làm những gì?",
      "Task nào đang in progress?",
      "Liệt kê task còn ở trạng thái Todo",
      "Đánh dấu task số 3 là hoàn thành",
      "Chuyển trạng thái task số 5 sang InProgress",
      "Cập nhật tiến độ task số 7 lên 60%",
      "Task nào đang làm dở mà sắp đến hạn?",
      "Việc nào chưa ai bắt đầu?",
    ],
  },
  {
    id: "create",
    title: "Tạo mới",
    hint: "Tạo dự án và công việc ngay trong hội thoại.",
    prompts: [
      "Tạo 1 project mới giúp tôi",
      "Tạo dự án mới tên là Website Revamp",
      "Thêm task mới vào dự án này",
      "Tạo task Sửa lỗi đăng nhập với mức ưu tiên Critical",
      "Tạo task viết tài liệu bàn giao",
      "Thêm 1 task ưu tiên cao cho dự án này",
    ],
  },
  {
    id: "analysis",
    title: "Phân tích sâu",
    hint: "Kết hợp nhiều điều kiện trong một câu hỏi.",
    prompts: [
      "Task rủi ro cao, chưa giao, đến hạn trong 7 ngày",
      "Có bao nhiêu task ưu tiên Critical còn đang mở?",
      "Liệt kê task đang làm mà đã quá hạn",
      "Việc nào vừa chưa có người vừa không có deadline?",
      "Đếm task theo từng trạng thái",
      "Task nào cần chú ý nhất tuần này?",
      "Những việc nào nên làm trước?",
      "Dự án này có điểm nghẽn nào không?",
    ],
  },
];

/** Flat list, for counting and for the search box. */
export const ALL_PROMPTS: string[] = PROMPT_LIBRARY.flatMap((group) => group.prompts);

/** Case-insensitive substring search across every suggestion. */
export function searchPrompts(term: string, limit = 8): string[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  return ALL_PROMPTS.filter((p) => p.toLowerCase().includes(needle)).slice(0, limit);
}
