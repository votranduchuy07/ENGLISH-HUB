/**
 * KHO CÂU NGHE PHONG CÁCH TOEIC — toàn bộ do chúng tôi tự viết (KHÔNG chép từ đề thi thật, vì đề thi có bản quyền).
 * Bám theo các tình huống quen thuộc trong bài thi: văn phòng, cuộc họp, du lịch, mua sắm, nhân sự, tài chính, hậu cần, nhà hàng - khách sạn, công nghệ.
 * Câu ngắn mô phỏng Part 1-2 / câu hội thoại; đoạn nhiều câu mô phỏng thông báo, voicemail ở Part 3-4.
 */
export type ToeicTopic = 'office' | 'meeting' | 'travel' | 'shopping' | 'hr' | 'finance' | 'logistics' | 'hospitality' | 'tech' | 'announcement'

export const TOEIC_TOPICS: Record<ToeicTopic, string> = {
  office: 'Văn phòng',
  meeting: 'Cuộc họp & lịch hẹn',
  travel: 'Du lịch & di chuyển',
  shopping: 'Mua sắm & dịch vụ',
  hr: 'Nhân sự & tuyển dụng',
  finance: 'Tài chính & hóa đơn',
  logistics: 'Giao hàng & kho vận',
  hospitality: 'Nhà hàng & khách sạn',
  tech: 'Công nghệ & hỗ trợ',
  announcement: 'Thông báo / voicemail',
}

export interface ToeicItem { id: string; topic: ToeicTopic; text: string }

const RAW: Record<ToeicTopic, string[]> = {
  office: [
    'Could you send me the revised budget before noon today?',
    'The printer on the third floor is out of order again.',
    'Please make sure all the documents are signed by Friday.',
    'Our department will move to the new building next month.',
    'I left the sales report on your desk this morning.',
    'The supply room is running low on envelopes and paper.',
    'Mr. Tanaka asked everyone to submit their time sheets early.',
    'We should reserve the large conference room for the training session.',
    'Would you mind forwarding that email to the whole team?',
    'The office will be closed on Monday because of the national holiday.',
  ],
  meeting: [
    'The quarterly meeting has been rescheduled to Thursday afternoon.',
    'Let us review the agenda before the clients arrive.',
    'I am afraid I have a conflict with the two o\'clock appointment.',
    'Ms. Garcia will present the results of the marketing survey.',
    'Could we postpone the discussion until everyone has read the proposal?',
    'The board approved the plan after a long debate.',
    'Please confirm your attendance by replying to this invitation.',
    'We need to finalize the schedule for the product launch this week.',
    'The interview with the candidate is set for ten thirty tomorrow.',
    'Thank you all for coming on such short notice.',
  ],
  travel: [
    'Passengers are requested to proceed to gate twelve for boarding.',
    'The flight to Singapore has been delayed by about forty minutes.',
    'I would like to book a round trip ticket to Chicago for next Tuesday.',
    'The train departs from platform four every fifteen minutes.',
    'Please keep your luggage with you at all times in the terminal.',
    'Our shuttle bus to the hotel leaves from the main exit.',
    'You must present your boarding pass and passport at the checkpoint.',
    'Due to heavy traffic, the delivery driver will arrive later than expected.',
  ],
  shopping: [
    'This jacket is available in three different colors and sizes.',
    'Customers who spend over fifty dollars receive a free gift.',
    'I would like to return this item because it does not fit.',
    'The store will offer a twenty percent discount this weekend only.',
    'Please keep your receipt in case you need to exchange the product.',
    'We guarantee a full refund within thirty days of purchase.',
    'The new refrigerator comes with a five year warranty.',
    'Our customer service team is available from nine to six.',
  ],
  hr: [
    'The company is looking for an experienced accountant to join our team.',
    'Applicants should submit a résumé and two letters of recommendation.',
    'All new employees must attend the orientation on their first day.',
    'Ms. Lee has been promoted to the position of regional manager.',
    'Annual performance reviews will take place in the first week of December.',
    'Employees may request vacation days at least two weeks in advance.',
    'The training workshop is mandatory for everyone in the sales department.',
    'He submitted his resignation after working here for eight years.',
  ],
  finance: [
    'The invoice must be paid within thirty days of the date of issue.',
    'Our revenue increased by twelve percent compared to last year.',
    'Please attach the receipts to your expense report.',
    'The bank will charge a small fee for international transfers.',
    'We are required to submit the tax documents by the end of March.',
    'The total cost of the renovation exceeded our original estimate.',
    'Payments can be made by credit card, check, or bank transfer.',
    'The accounting team is preparing the annual financial statement.',
  ],
  logistics: [
    'Your order has been shipped and should arrive within three business days.',
    'The shipment was damaged during transportation and needs to be replaced.',
    'Please inspect the goods carefully when the delivery arrives.',
    'The warehouse manager is checking the inventory this afternoon.',
    'We apologize for the delay caused by unexpected shortages of materials.',
    'Express delivery is available for an additional charge.',
    'The supplier promised to deliver the parts by the end of the week.',
    'All packages must be labeled clearly before they are collected.',
  ],
  hospitality: [
    'I have a reservation for a table of four at seven thirty.',
    'Breakfast is served in the dining room from six to ten every morning.',
    'The hotel offers free wireless internet to all of its guests.',
    'Would you prefer a window seat or a table near the entrance?',
    'Check out time is eleven o\'clock, but you may leave your bags at the front desk.',
    'The chef recommends the grilled salmon with seasonal vegetables.',
    'We would like to request a late check in because our flight is delayed.',
    'Please let the staff know if you have any food allergies.',
  ],
  tech: [
    'You will need to update the software before you can log in.',
    'The technician is coming to repair the network connection this afternoon.',
    'Please back up your files regularly to avoid losing important data.',
    'The new application allows employees to book rooms from their phones.',
    'I forgot my password, so I cannot access the shared folder.',
    'Our website will be unavailable tonight because of scheduled maintenance.',
    'The security system requires two steps to verify your identity.',
    'Please restart your computer once the installation has finished.',
  ],
  announcement: [
    'Attention all passengers. Flight two one four to Boston is now ready for boarding. Please have your boarding pass and identification ready at the gate.',
    'Good morning, everyone. This is a reminder that the fire drill will take place at ten o\'clock. Please leave the building calmly through the nearest exit.',
    'Hello, this is Anna from Greenfield Dental. I am calling to confirm your appointment tomorrow at three fifteen. If you cannot attend, please call us back before noon.',
    'Welcome to Harbor Market. Today only, all fresh fruit is thirty percent off. Our bakery will also be giving out free samples near the main entrance.',
    'Thank you for calling Bright Telecom. Our offices are currently closed. If your call is urgent, please press one to reach the technical support line.',
    'Ladies and gentlemen, the museum will close in fifteen minutes. Please make your way to the exit, and do not forget to visit the gift shop on your way out.',
    'This is a message for Mr. Evans. Your suit is ready for pickup at our downtown store. We are open until eight o\'clock every evening except Sunday.',
    'Attention staff. The elevator on the east side will be out of service this afternoon. Please use the stairs or the elevator near the cafeteria.',
  ],
}

export const TOEIC_ITEMS: ToeicItem[] = (Object.keys(RAW) as ToeicTopic[]).flatMap((topic) =>
  RAW[topic].map((text, i) => ({ id: `${topic}-${i + 1}`, topic, text })),
)

/** Độ khó theo độ dài câu. */
export function itemLevel(text: string): 'easy' | 'medium' | 'hard' {
  const n = text.trim().split(/\s+/).length
  return n <= 10 ? 'easy' : n <= 16 ? 'medium' : 'hard'
}
export const LEVEL_LABEL = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' } as const

/* ============ HỘI THOẠI + CÂU HỎI (mô phỏng Part 3) — cũng do chúng tôi tự viết ============ */
export interface ConvQuestion { q: string; options: string[]; answer: number }
export interface Conversation { id: string; topic: ToeicTopic; lines: { who: 'A' | 'B'; text: string }[]; questions: ConvQuestion[] }

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c-printer', topic: 'office',
    lines: [
      { who: 'A', text: 'Hi Daniel, do you know why the printer on our floor isn\'t working?' },
      { who: 'B', text: 'Yes, it ran out of toner this morning. I already ordered a new cartridge, but it won\'t arrive until Thursday.' },
      { who: 'A', text: 'That\'s a problem. I need to print the contracts for the two o\'clock meeting.' },
      { who: 'B', text: 'You can use the machine in the accounting department. Just ask Maria for the access code.' },
    ],
    questions: [
      { q: 'What is the problem?', options: ['The printer is out of toner', 'The meeting was cancelled', 'The contracts are missing', 'The access code is wrong'], answer: 0 },
      { q: 'What does the man suggest the woman do?', options: ['Wait until Thursday', 'Use another department\'s printer', 'Order a new printer', 'Email the contracts'], answer: 1 },
    ],
  },
  {
    id: 'c-flight', topic: 'travel',
    lines: [
      { who: 'A', text: 'Good afternoon. I\'d like to change my flight to Seoul from Friday morning to Saturday.' },
      { who: 'B', text: 'Certainly. There is a flight on Saturday at nine fifteen, but there is a change fee of forty dollars.' },
      { who: 'A', text: 'That\'s fine. Can I also request an aisle seat?' },
      { who: 'B', text: 'Of course. I\'ll send the new itinerary to your email right away.' },
    ],
    questions: [
      { q: 'Why is the woman calling?', options: ['To cancel a trip', 'To change a flight', 'To book a hotel', 'To complain about a fee'], answer: 1 },
      { q: 'What will the man do next?', options: ['Refund the ticket', 'Upgrade the seat to business class', 'Send a new itinerary', 'Call the airport'], answer: 2 },
    ],
  },
  {
    id: 'c-interview', topic: 'hr',
    lines: [
      { who: 'A', text: 'Thank you for coming in, Mr. Park. Could you tell me about your experience in project management?' },
      { who: 'B', text: 'Certainly. I\'ve managed teams of up to twelve people for six years, mostly in the software industry.' },
      { who: 'A', text: 'Excellent. When would you be available to start if we offered you the position?' },
      { who: 'B', text: 'I need to give a month\'s notice to my current employer, so early next month.' },
    ],
    questions: [
      { q: 'Where is this conversation most likely taking place?', options: ['At a job interview', 'At a product launch', 'At a training workshop', 'At an airport'], answer: 0 },
      { q: 'Why can the man not start immediately?', options: ['He is traveling abroad', 'He must notify his current employer', 'He is waiting for a visa', 'He needs more training'], answer: 1 },
    ],
  },
  {
    id: 'c-invoice', topic: 'finance',
    lines: [
      { who: 'A', text: 'Excuse me, I think there is a mistake on this invoice. We were charged twice for the delivery.' },
      { who: 'B', text: 'Let me check. You\'re right, I\'m very sorry about that. I\'ll issue a corrected invoice this afternoon.' },
      { who: 'A', text: 'Thank you. Our accounting team needs it before the end of the week to close the monthly report.' },
      { who: 'B', text: 'No problem. You will have it by tomorrow morning.' },
    ],
    questions: [
      { q: 'What is wrong with the invoice?', options: ['The date is incorrect', 'A charge appears twice', 'The total is too low', 'The address is missing'], answer: 1 },
      { q: 'When will the woman receive the corrected invoice?', options: ['This afternoon', 'Tomorrow morning', 'At the end of the week', 'Next month'], answer: 1 },
    ],
  },
  {
    id: 'c-hotel', topic: 'hospitality',
    lines: [
      { who: 'A', text: 'Welcome to the Lakeside Hotel. Do you have a reservation?' },
      { who: 'B', text: 'Yes, under the name Nguyen. Two nights, and I requested a room with a view of the lake.' },
      { who: 'A', text: 'I\'m sorry, the lake view rooms are fully booked tonight, but I can offer you a garden view with free breakfast.' },
      { who: 'B', text: 'That sounds acceptable. What time is breakfast served?' },
    ],
    questions: [
      { q: 'What problem does the woman mention?', options: ['The reservation was lost', 'Lake view rooms are unavailable', 'The hotel is closed', 'Breakfast is not offered'], answer: 1 },
      { q: 'What does the woman offer the man?', options: ['A discount on the room', 'A free breakfast', 'A late check-out', 'A taxi service'], answer: 1 },
    ],
  },
  {
    id: 'c-software', topic: 'tech',
    lines: [
      { who: 'A', text: 'Tech support, how can I help you?' },
      { who: 'B', text: 'Hello, I can\'t log in to the company portal. It keeps saying my password has expired.' },
      { who: 'A', text: 'I see. I\'ll send a reset link to your work email. Please choose a new password with at least ten characters.' },
      { who: 'B', text: 'Got it. Should I restart my computer afterward?' },
    ],
    questions: [
      { q: 'Why is the man calling?', options: ['His computer is broken', 'He cannot log in', 'He wants a new phone', 'He lost his email'], answer: 1 },
      { q: 'What will the woman send?', options: ['A new computer', 'A software update', 'A password reset link', 'A security badge'], answer: 2 },
    ],
  },
  {
    id: 'c-delivery', topic: 'logistics',
    lines: [
      { who: 'A', text: 'Hello, I\'m calling about order number four seven two. It was supposed to arrive yesterday.' },
      { who: 'B', text: 'I apologize for the delay. The shipment was held up at customs, but it should be delivered by Wednesday.' },
      { who: 'A', text: 'We\'re opening the new store on Thursday, so it really must arrive before then.' },
      { who: 'B', text: 'I\'ll mark it as urgent and arrange express delivery at no extra cost.' },
    ],
    questions: [
      { q: 'What caused the delay?', options: ['Bad weather', 'A customs check', 'A wrong address', 'A damaged package'], answer: 1 },
      { q: 'What will the man do for the customer?', options: ['Offer a refund', 'Arrange free express delivery', 'Cancel the order', 'Send a replacement next week'], answer: 1 },
    ],
  },
  {
    id: 'c-meeting', topic: 'meeting',
    lines: [
      { who: 'A', text: 'Julia, are you free to meet tomorrow to go over the marketing budget?' },
      { who: 'B', text: 'I\'m in training sessions all morning, but I could do three thirty in the afternoon.' },
      { who: 'A', text: 'Three thirty works. Shall we use the small conference room on the fourth floor?' },
      { who: 'B', text: 'Good idea. I\'ll bring the latest sales figures and send you the agenda tonight.' },
    ],
    questions: [
      { q: 'What will the speakers discuss?', options: ['A training schedule', 'The marketing budget', 'A job offer', 'Office renovations'], answer: 1 },
      { q: 'What does Julia say she will do tonight?', options: ['Reserve a room', 'Call a client', 'Send an agenda', 'Print the figures'], answer: 2 },
    ],
  },
]
