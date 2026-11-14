/** Nội dung tĩnh do English Hub biên soạn: chủ đề, trích dẫn, bài nghe, cặp từ dễ nhầm. */

export const TOPICS: Record<string, { vi: string; en: string }> = {
  'daily-life': { vi: 'Đời sống hằng ngày', en: 'Daily life' },
  people: { vi: 'Con người & quan hệ', en: 'People' },
  food: { vi: 'Ẩm thực', en: 'Food' },
  travel: { vi: 'Du lịch', en: 'Travel' },
  work: { vi: 'Công việc', en: 'Work' },
  education: { vi: 'Giáo dục', en: 'Education' },
  emotions: { vi: 'Cảm xúc', en: 'Emotions' },
  nature: { vi: 'Thiên nhiên', en: 'Nature' },
  technology: { vi: 'Công nghệ', en: 'Technology' },
  health: { vi: 'Sức khỏe', en: 'Health' },
  society: { vi: 'Xã hội', en: 'Society' },
  science: { vi: 'Khoa học', en: 'Science' },
  arts: { vi: 'Nghệ thuật', en: 'Arts' },
  business: { vi: 'Kinh doanh', en: 'Business' },
  abstract: { vi: 'Khái niệm trừu tượng', en: 'Abstract ideas' },
}

export const POS_VI: Record<string, string> = {
  noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ', preposition: 'giới từ',
  conjunction: 'liên từ', pronoun: 'đại từ', determiner: 'hạn định từ', phrase: 'cụm từ',
}
export const POS_ABBR: Record<string, string> = {
  noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', preposition: 'prep.', conjunction: 'conj.', pronoun: 'pron.', determiner: 'det.', phrase: 'phr.',
}

export const CEFR_INFO = {
  A1: { en: 'Beginner', vi: 'Sơ cấp' },
  A2: { en: 'Elementary', vi: 'Cơ bản' },
  B1: { en: 'Intermediate', vi: 'Trung cấp' },
  B2: { en: 'Upper Intermediate', vi: 'Trung cao cấp' },
  C1: { en: 'Advanced', vi: 'Cao cấp' },
  C2: { en: 'Proficiency', vi: 'Thành thạo' },
} as const

/** Trích dẫn nổi tiếng thuộc phạm vi công cộng; "tương truyền" khi nguồn gốc chưa chắc chắn. */
export const QUOTES = [
  { en: 'The limits of my language mean the limits of my world.', vi: 'Giới hạn ngôn ngữ của tôi là giới hạn thế giới của tôi.', author: 'Ludwig Wittgenstein', word: 'limit', note: 'limit (n.) — giới hạn' },
  { en: 'Knowledge is power.', vi: 'Tri thức là sức mạnh.', author: 'Francis Bacon', word: 'knowledge', note: 'knowledge (n.) — tri thức, hiểu biết' },
  { en: 'Well begun is half done.', vi: 'Khởi đầu tốt là đã xong một nửa.', author: 'Aristotle (tương truyền)', word: 'begun', note: 'begin → began → begun' },
  { en: 'The roots of education are bitter, but the fruit is sweet.', vi: 'Gốc rễ của giáo dục thì đắng, nhưng quả ngọt.', author: 'Aristotle (tương truyền)', word: 'bitter', note: 'bitter (adj.) — đắng, cay đắng' },
  { en: 'An investment in knowledge pays the best interest.', vi: 'Đầu tư vào tri thức mang lại lợi tức cao nhất.', author: 'Benjamin Franklin (tương truyền)', word: 'interest', note: 'interest (n.) — tiền lãi; sự quan tâm' },
  { en: 'Live as if you were to die tomorrow. Learn as if you were to live forever.', vi: 'Hãy sống như thể ngày mai bạn chết. Hãy học như thể bạn sống mãi mãi.', author: 'Mahatma Gandhi (tương truyền)', word: 'forever', note: 'forever (adv.) — mãi mãi' },
  { en: 'Practice is the best of all instructors.', vi: 'Luyện tập là người thầy giỏi nhất.', author: 'Publilius Syrus', word: 'instructor', note: 'instructor (n.) — người hướng dẫn' },
  { en: 'Patience is bitter, but its fruit is sweet.', vi: 'Kiên nhẫn thì đắng, nhưng quả của nó thì ngọt.', author: 'Jean-Jacques Rousseau (tương truyền)', word: 'patience', note: 'patience (n.) — sự kiên nhẫn' },
  { en: 'A journey of a thousand miles begins with a single step.', vi: 'Hành trình nghìn dặm bắt đầu từ một bước chân.', author: 'Lão Tử (bản dịch tiếng Anh phổ biến)', word: 'journey', note: 'journey (n.) — hành trình' },
  { en: 'We are what we repeatedly do.', vi: 'Chúng ta là những gì chúng ta lặp đi lặp lại.', author: 'Will Durant (diễn giải Aristotle)', word: 'repeatedly', note: 'repeatedly (adv.) — lặp đi lặp lại' },
]

/** Bài nghe đoạn văn ngắn — văn bản gốc do English Hub viết. */
export interface Passage {
  id: string
  level: 'A2' | 'B1' | 'B2' | 'C1'
  title: string
  text: string
  questions: { q: string; options: string[]; answer: number }[]
}

export const PASSAGES: Passage[] = [
  {
    id: 'p-market', level: 'A2', title: 'Sáng thứ Bảy ở chợ',
    text: 'Every Saturday morning, Lan goes to the market with her grandmother. They buy fresh vegetables, fruit and fish. Her grandmother always talks to the sellers, because she has known them for many years. After shopping, they drink a glass of sugarcane juice and walk home slowly.',
    questions: [
      { q: 'Lan đi chợ với ai?', options: ['Mẹ', 'Bà', 'Bạn thân', 'Hàng xóm'], answer: 1 },
      { q: 'Họ làm gì sau khi mua sắm?', options: ['Đi xe buýt về nhà', 'Ăn phở', 'Uống nước mía', 'Gặp bạn bè'], answer: 2 },
    ],
  },
  {
    id: 'p-library', level: 'B1', title: 'Một thư viện kiểu mới',
    text: 'The new city library opened last month, and it is very different from the old one. Instead of long rows of silent desks, there are rooms where students can work in groups, a small café and even a studio for recording podcasts. However, the top floor is still a quiet area for people who prefer to read alone.',
    questions: [
      { q: 'Thư viện mới khác thư viện cũ như thế nào?', options: ['Nhỏ hơn', 'Có phòng học nhóm và phòng thu', 'Đóng cửa sớm hơn', 'Không còn sách'], answer: 1 },
      { q: 'Tầng trên cùng dành cho ai?', options: ['Người thích đọc một mình', 'Trẻ em', 'Người làm podcast', 'Nhân viên thư viện'], answer: 0 },
    ],
  },
  {
    id: 'p-sleep', level: 'B1', title: 'Giấc ngủ và trí nhớ',
    text: 'Many students stay up late before an exam, but research suggests this is not a good idea. While we sleep, the brain organises the information we learned during the day. People who sleep well after studying usually remember more than people who study all night without rest.',
    questions: [
      { q: 'Theo đoạn văn, não làm gì khi ta ngủ?', options: ['Ngừng hoạt động', 'Sắp xếp thông tin đã học', 'Quên thông tin cũ', 'Tạo ra giấc mơ đáng sợ'], answer: 1 },
      { q: 'Ai thường nhớ được nhiều hơn?', options: ['Người học suốt đêm', 'Người ngủ ngon sau khi học', 'Người không học', 'Người uống cà phê'], answer: 1 },
    ],
  },
  {
    id: 'p-remote', level: 'B2', title: 'Làm việc từ xa',
    text: 'Remote work has become widespread, and many employees appreciate the flexibility it offers. Nevertheless, some managers are reluctant to abandon the traditional office. They argue that spontaneous conversations in the corridor often lead to creative solutions, and that these are difficult to reproduce on a video call.',
    questions: [
      { q: 'Nhân viên đánh giá cao điều gì ở làm việc từ xa?', options: ['Lương cao hơn', 'Sự linh hoạt', 'Ít cuộc họp hơn', 'Văn phòng đẹp hơn'], answer: 1 },
      { q: 'Vì sao một số quản lý ngần ngại bỏ văn phòng?', options: ['Vì chi phí thuê rẻ', 'Vì cuộc trò chuyện tự phát tạo ra ý tưởng sáng tạo', 'Vì nhân viên muốn quay lại', 'Vì gọi video quá đắt'], answer: 1 },
    ],
  },
  {
    id: 'p-city-heat', level: 'B2', title: 'Thành phố nóng lên',
    text: 'Cities are often several degrees warmer than the surrounding countryside, because concrete and asphalt absorb heat during the day and release it at night. Planting trees and creating green roofs can significantly reduce this effect. In some cities, painting roofs white has also helped to keep buildings cooler.',
    questions: [
      { q: 'Vì sao thành phố nóng hơn vùng quê?', options: ['Vì có nhiều người hơn', 'Vì bê tông và nhựa đường hấp thụ và tỏa nhiệt', 'Vì ít mưa hơn', 'Vì gần mặt trời hơn'], answer: 1 },
      { q: 'Giải pháp nào KHÔNG được nhắc đến?', options: ['Trồng cây', 'Mái nhà xanh', 'Sơn mái nhà màu trắng', 'Cấm ô tô'], answer: 3 },
    ],
  },
  {
    id: 'p-translation', level: 'C1', title: 'Nghệ thuật dịch thuật',
    text: 'A literal translation is rarely a faithful one. Every language carries nuances that resist direct conversion, and a translator must constantly decide whether to preserve the original form or the original effect. The most respected translators are not those who know the most words, but those who understand why a sentence was written the way it was.',
    questions: [
      { q: 'Theo tác giả, bản dịch sát nghĩa đen thường thế nào?', options: ['Luôn trung thành nhất', 'Hiếm khi trung thành', 'Dễ đọc nhất', 'Được ưa chuộng nhất'], answer: 1 },
      { q: 'Dịch giả được kính trọng nhất là người…', options: ['Biết nhiều từ nhất', 'Dịch nhanh nhất', 'Hiểu vì sao câu văn được viết như vậy', 'Biết nhiều ngôn ngữ nhất'], answer: 2 },
    ],
  },
]

/** Cặp từ dễ nhầm. */
export const CONFUSABLES = [
  { pair: ['affect', 'effect'], sentence: 'The new rules will ___ everyone in the company.', answer: 'affect', explain: 'affect (v.) = ảnh hưởng đến; effect (n.) = tác động, kết quả.' },
  { pair: ['affect', 'effect'], sentence: 'The medicine had no ___ on his headache.', answer: 'effect', explain: 'Sau "no" cần danh từ → effect.' },
  { pair: ['accept', 'except'], sentence: 'Everyone came to the meeting ___ Tom.', answer: 'except', explain: 'except = ngoại trừ; accept = chấp nhận.' },
  { pair: ['lose', 'loose'], sentence: 'Be careful not to ___ your passport.', answer: 'lose', explain: 'lose (v.) = đánh mất; loose (adj.) = lỏng.' },
  { pair: ['lose', 'loose'], sentence: 'These trousers are too ___ for me.', answer: 'loose', explain: 'loose (adj.) = rộng, lỏng.' },
  { pair: ['advice', 'advise'], sentence: 'Can you give me some ___ about my essay?', answer: 'advice', explain: 'advice (n., không đếm được) = lời khuyên; advise (v.) = khuyên.' },
  { pair: ['advice', 'advise'], sentence: 'I would ___ you to book early.', answer: 'advise', explain: 'Sau "would" cần động từ → advise.' },
  { pair: ['borrow', 'lend'], sentence: 'Could you ___ me your umbrella?', answer: 'lend', explain: 'lend = cho mượn; borrow = mượn của người khác.' },
  { pair: ['principal', 'principle'], sentence: 'Honesty is an important ___ in my life.', answer: 'principle', explain: 'principle = nguyên tắc; principal = hiệu trưởng / chính yếu.' },
  { pair: ['compliment', 'complement'], sentence: 'She paid me a lovely ___ on my presentation.', answer: 'compliment', explain: 'compliment = lời khen; complement = bổ sung cho hoàn chỉnh.' },
  { pair: ['economic', 'economical'], sentence: 'This small car is very ___ to run.', answer: 'economical', explain: 'economical = tiết kiệm; economic = thuộc về kinh tế.' },
  { pair: ['sensible', 'sensitive'], sentence: 'Wearing a helmet is a ___ decision.', answer: 'sensible', explain: 'sensible = hợp lý, khôn ngoan; sensitive = nhạy cảm.' },
]
