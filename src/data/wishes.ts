// Lời chúc riêng cho từng bạn nữ, lời chúc chung và bất ngờ dành cho cô giáo.
// Mỗi lời ngắn (dưới ~280 ký tự), giọng bạn bè trong lớp, không bịa chi tiết cá nhân.
import { CONFIG } from "./config";
import { givenName, normalizeVi, stripPrefix } from "../lib/text";

export type WishKind = "girl" | "teacher" | "guest";

export type WishTarget = {
  id: string;
  name: string;
  given: string;
  kind: WishKind;
  wishes: string[];
  signature: string;
};

const SIGN = "— Các bạn nam lớp 11B7 —";
const TEACHER_SIGN = "— Tập thể lớp 11B7 —";

export const GIRL_WISHES: Record<string, string[]> = {
  "Mai Thị Vân Anh": [
    "Vân Anh ơi, chúc cậu 20/10 thật nhiều niềm vui nhỏ xinh. Cảm ơn cậu vì những ngày đến lớp luôn nhẹ nhàng và tử tế. Cứ giữ nụ cười đó mãi nhé.",
    "Chúc Vân Anh luôn tự tin với những điều mình đang làm. Cậu không cần phải vội, cứ đi theo nhịp của riêng mình. Bọn tớ ở đây, cùng cậu.",
    "Mong Vân Anh có một ngày 20/10 thật ấm, được ăn món mình thích và nghe những lời thương nhất. Cảm ơn cậu đã là một phần của 11B7.",
  ],
  "Nguyễn Thị Tùng Chi": [
    "Tùng Chi ơi, chúc cậu ngày 20/10 thật rạng rỡ. Cảm ơn cậu vì những lần giúp lớp mà chẳng ai kịp nhớ để cảm ơn. Mong cậu luôn được thương theo cách dịu dàng nhất.",
    "Chúc cậu luôn có đủ can đảm để thử điều mình thích. Đừng ngại hỏi, đừng ngại sai, vì cậu đang lớn lên rất đẹp. 20/10 vui nhiều nha.",
    "Mong những ngày tới của Tùng Chi toàn chuyện vui để kể. Mệt thì nghỉ, buồn thì gọi bọn tớ. Chúc cậu thật nhiều sức khỏe và bình yên.",
  ],
  "Nguyễn Ngọc Diệp": [
    "Diệp ơi, 20/10 chúc cậu luôn xinh, luôn vui và luôn là chính mình. Bọn tớ thích cái cách cậu xuất hiện, nhẹ nhàng mà ai cũng nhớ.",
    "Mong Diệp có một ngày thật đẹp, được nhận nhiều lời khen và không phải lo gì cả. Cảm ơn cậu vì đã là một phần thanh xuân của lớp mình.",
    "Chúc cậu luôn dịu dàng với mọi người, nhưng cũng nhớ thương mình trước. 20/10 vui vẻ và ngập hoa nha Diệp.",
  ],
  "Vũ Việt Hà": [
    "Việt Hà ơi, chúc cậu ngày 20/10 thật nhiều niềm vui. Cứ tự tin làm điều mình muốn, bọn tớ luôn ủng hộ cậu từ phía sau.",
    "Cảm ơn cậu vì những ngày ở lớp luôn có tiếng cười. Mong cậu giữ được sự hồn nhiên đó càng lâu càng tốt. Chúc cậu hạnh phúc, thật đấy.",
    "Mong 20/10 của Việt Hà có hoa, có bánh và có những người thật lòng thương cậu. Cậu xứng đáng với những điều dễ thương như thế.",
  ],
  "Nguyễn Ngọc Hân": [
    "Ngọc Hân à, chúc cậu 20/10 thật rạng rỡ. Cậu không cần phải giỏi hết mọi thứ để được yêu thương. Cứ là cậu thôi, đã đủ đáng quý rồi.",
    "Mong Hân có một ngày tràn ngập tiếng cười và một tối thật bình yên. Cảm ơn vì cậu luôn ở lại và nghe mọi người nói.",
    "Chúc cậu luôn đủ mạnh mẽ để bảo vệ ước mơ của mình. 11B7 tự hào vì có cậu, Hân nhé.",
  ],
  "Nguyễn Thị Thu Hiền": [
    "Thu Hiền ơi, 20/10 chúc cậu luôn vui vẻ và bình an. Cảm ơn những lần cậu giúp lớp mà chẳng nề hà. Mong cậu được yêu thương nhiều hơn nữa.",
    "Mong Hiền luôn giữ được sự dịu dàng của mình, và luôn có người đối xử dịu dàng lại với cậu. Chúc cậu một ngày thật đẹp.",
    "Chúc cậu luôn đủ sức khỏe, đủ can đảm và đủ kiên nhẫn với những điều mình đang chờ đợi. 20/10 vui nhiều nha.",
  ],
  "Hoàng Xuân Mai": [
    "Xuân Mai ơi, chúc cậu ngày 20/10 thật nhiều hoa và thật nhiều lời thương. Cậu mang đến cho lớp một cảm giác rất dễ chịu, cứ giữ vậy nha.",
    "Mong Mai luôn có những ngày vui để nhớ, và có người ở cạnh lúc cậu chẳng muốn nói gì. Bọn tớ cảm ơn cậu nhiều.",
    "Chúc Mai luôn tự tin với những lựa chọn của mình. Không ai cần hoàn hảo mới được yêu thương cả. 20/10 rạng rỡ nhé.",
  ],
  "Phạm Nhật Thanh Minh": [
    "Thanh Minh ơi, chúc cậu ngày 20/10 thật sáng và thật nhiều niềm vui. Cảm ơn cậu vì những lời nói tử tế dành cho mọi người.",
    "Mong cậu luôn đủ tự tin để bước lên trước, và đủ bình yên để nghỉ một chút khi cần. 11B7 luôn ủng hộ cậu.",
    "Chúc cậu có một ngày 20/10 được khen đủ nhiều, được cười đủ lâu và được thương đúng cách. Cảm ơn cậu vì đã là cậu.",
  ],
  "Lưu Khánh Nhi": [
    "Khánh Nhi à, 20/10 chúc cậu luôn xinh, luôn tươi và luôn gặp điều tốt. Cậu là một trong những lý do bọn tớ thấy lớp mình đầy năng lượng.",
    "Mong Nhi luôn có thời gian cho bản thân, chứ đừng chỉ lo cho mọi người. Chúc cậu ngủ đủ giấc và cười thật nhiều hôm nay.",
    "Chúc những dự định nhỏ của cậu sớm thành thật. Bọn tớ cổ vũ cậu bằng cả hai tay. Vui vẻ nha Khánh Nhi.",
  ],
  "Trịnh Vy Oanh": [
    "Vy Oanh ơi, chúc cậu ngày 20/10 thật nhiều yêu thương. Cứ tự tin tỏa sáng theo cách của cậu, bọn tớ thấy đẹp mà.",
    "Mong Oanh giữ được sự chân thành của mình, vì nó quý lắm. Chúc cậu một ngày nhẹ nhàng, đầy hoa và đầy tiếng cười.",
    "Chúc cậu luôn hoàn thành được những điều mình đã hứa với bản thân. Cậu đang làm tốt hơn cậu nghĩ đó, Vy Oanh.",
  ],
  "Phan Thị Minh Phương": [
    "Minh Phương ơi, chúc cậu 20/10 thật nhiều niềm vui. Cảm ơn cậu vì những ngày lớp mình vui hơn chỉ vì cậu ở đó.",
    "Mong cậu luôn tin vào chính mình, kể cả những hôm mọi thứ không ổn. Cậu xứng đáng được thương thật nhiều.",
    "Chúc cậu những ngày tới nhẹ như mây, may như ý và có thật nhiều chuyện vui để kể bọn tớ nghe.",
  ],
  "Bùi Minh Thư": [
    "Minh Thư à, chúc cậu ngày 20/10 thật đẹp. Cứ sống chậm thôi, cứ cười thôi, năm tháng sẽ tự sắp xếp ổn thỏa.",
    "Mong cậu luôn được nghe những lời tử tế và được yêu bởi những người xứng đáng. Bọn tớ thương cậu, thật lòng.",
    "Chúc Thư có một ngày đầy hoa, đầy bánh ngọt và đầy lời chúc. Và luôn giữ được cái sự dịu dàng rất riêng ấy nhé.",
  ],
  "Trần Ngọc Bảo Trân": [
    "Bảo Trân ơi, 20/10 chúc cậu luôn rạng rỡ và may mắn. Cảm ơn vì cậu luôn mang lại cảm giác dễ chịu khi ở cạnh.",
    "Mong cậu sớm đạt được điều mình đang cố gắng. Nhưng nhớ là cậu không cần phải chạy nhanh hơn ai cả. Cứ đi nha.",
    "Chúc Bảo Trân được yêu thương, được lắng nghe và được vui trọn vẹn hôm nay. 11B7 có cậu là một điều hay.",
  ],
  "Nguyễn Hà Trang": [
    "Hà Trang ơi, chúc cậu ngày 20/10 ngập niềm vui. Cậu cứ tự nhiên là chính mình, bọn tớ thấy vậy là đẹp nhất rồi.",
    "Mong cậu giữ được sự ấm áp của mình, và có người giữ lại sự ấm áp đó cho cậu. Chúc cậu hôm nay thật trọn vẹn.",
    "Chúc những ngày tới của Hà Trang thật nhẹ nhàng. Có mệt thì nghỉ, có vui thì kể, bọn tớ vẫn ở đây.",
  ],
  "Nguyên Tùng Chi": [
    "Tùng Chi ơi, chúc cậu 20/10 thật vui. Mong cậu luôn đủ kiên nhẫn với những điều tốt đẹp đang đến gần.",
    "Cảm ơn cậu vì những lúc bọn tớ chưa kịp hỏi thì cậu đã giúp rồi. Mong cậu luôn gặp được sự tử tế giống như mình đã trao đi.",
    "Chúc Tùng Chi có thật nhiều sức khỏe và những ngày không phải lo gì. Cậu xứng đáng với những điều dịu dàng nhất.",
  ],
  "Nguyễn Thu Trang": [
    "Thu Trang à, chúc cậu ngày 20/10 thật rạng rỡ. Bọn tớ cảm ơn vì cậu luôn làm lớp mình nhẹ nhàng hơn bằng những điều rất nhỏ.",
    "Mong cậu luôn tự tin với những gì mình đang xây. Cậu không phải là bản sao của ai, và điều đó đáng quý lắm.",
    "Chúc Thu Trang có một ngày ngập hoa và tiếng cười. Nhớ ưu tiên bản thân mình một chút nha.",
  ],
};

export const FALLBACK_WISHES: string[] = [
  "Chúc {name} ngày 20/10 thật nhiều niềm vui, thật nhiều sức khỏe và những điều bình yên nhất. Cảm ơn bạn vì đã ghé qua món quà nhỏ của 11B7.",
  "{name} ơi, chúc bạn một ngày 20/10 thật đẹp, được cười nhiều và được thương theo cách dịu dàng nhất.",
  "Dù chưa có tên trong danh sách, 11B7 vẫn muốn gửi tới {name} những lời chúc tốt lành nhất. Mong bạn luôn tự tin và hạnh phúc.",
  "Chúc {name} luôn đủ can đảm để làm điều mình thích, đủ bình yên để nghỉ khi mệt, và đủ yêu thương để thấy mình xứng đáng.",
  "Mong {name} có thật nhiều sức khỏe, thật nhiều tiếng cười và những người bạn biết lắng nghe. 20/10 vui vẻ nhé.",
  "Gửi {name} một bó hoa nhỏ xinh và một lời thương chân thành từ 11B7. Chúc bạn mọi điều tốt đẹp đang trên đường tới.",
];

export const TEACHER = {
  name: "Hoàng Thị Hoa",
  displayName: "Cô Hoàng Thị Hoa",
  normalized: "hoang thi hoa",
};

export const TEACHER_WISHES: string[] = [
  "Nhân ngày 20/10, em muốn thay mặt cả lớp gửi tới cô những lời tri ân chân thành nhất. Cảm ơn cô đã kiên nhẫn dạy dỗ, đã bao dung với những lúc lớp mình còn vụng về. Chúc cô thật nhiều sức khỏe, luôn hạnh phúc và gặp nhiều điều an yên.",
  "Cô ơi, 11B7 gửi tới cô một bó hoa nhỏ và thật nhiều lời cảm ơn. Cũng có lúc lớp mình khiến cô phải lo, nhưng cả lớp luôn nhớ những điều cô đã dạy. Kính chúc cô ngày 20/10 thật vui, thật khỏe và luôn được yêu thương.",
  "Nhân ngày Phụ nữ Việt Nam 20/10, em xin kính chúc cô sức khỏe dồi dào, công việc thuận lợi và gia đình thật nhiều hạnh phúc. Cảm ơn cô đã luôn ở đó, kiên nhẫn và dạy chúng em nhiều điều. Tập thể lớp 11B7 kính tặng cô.",
];

/** Tìm các bạn nữ khớp với từ khóa nhập vào (đã chuẩn hóa tiếng Việt). */
export function searchGirls(query: string): WishTarget[] {
  const key = stripPrefix(query);
  if (!key) return [];
  return CONFIG.girls
    .filter((name) => {
      const full = normalizeVi(name);
      if (full === key) return true;
      const words = full.split(" ");
      const queryWords = key.split(" ");
      for (let start = 0; start + queryWords.length <= words.length; start += 1) {
        if (queryWords.every((part, offset) => words[start + offset] === part)) return true;
      }
      return false;
    })
    .map((name) => ({
      id: name,
      name,
      given: givenName(name),
      kind: "girl" as const,
      wishes: GIRL_WISHES[name] || FALLBACK_WISHES.slice(0, 2),
      signature: SIGN,
    }));
}

export function isTeacher(query: string): boolean {
  const raw = normalizeVi(query);
  if (!raw) return false;
  const withPrefix = raw.replace(/^(co giao|co)\s+/, "").trim();
  // Chỉ khớp họ tên đầy đủ (có thể kèm "cô"/"cô giáo"); gõ "Hoa" không khớp.
  return withPrefix === TEACHER.normalized;
}

export function makeTeacherTarget(): WishTarget {
  return {
    id: "teacher",
    name: TEACHER.displayName,
    given: "cô",
    kind: "teacher",
    wishes: TEACHER_WISHES,
    signature: TEACHER_SIGN,
  };
}

export function makeGuestTarget(rawName: string): WishTarget {
  const display = rawName.trim().replace(/\s+/g, " ") || "bạn";
  return {
    id: "guest-" + display.toLowerCase(),
    name: display,
    given: display,
    kind: "guest",
    wishes: FALLBACK_WISHES.map((item) => item.replace(/\{name\}/g, display)),
    signature: SIGN,
  };
}

export function makeGirlTarget(name: string): WishTarget {
  return {
    id: name,
    name,
    given: givenName(name),
    kind: "girl",
    wishes: GIRL_WISHES[name] || FALLBACK_WISHES.map((item) => item.replace(/\{name\}/g, givenName(name))),
    signature: SIGN,
  };
}
