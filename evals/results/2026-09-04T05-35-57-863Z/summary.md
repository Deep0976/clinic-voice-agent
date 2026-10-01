# Eval run 2026-09-04T05-35-57-863Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 20 OK · 0 CHECK · 0 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Sure, we have two slots tomorrow evening: Friday 5 Sept at 6:00 pm or Friday 5 Sept at 7:00 pm. Which one works for you?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** Sure, we have two morning slots for tomorrow:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  

Please let me know which one you’d prefer.

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Ji, sabse jaldi slot yeh hain: **Friday 5 September, 9:00 am**, **Friday 5 September, 9:30 am**, ya **Friday 5 September, 12:30 pm**. Aap kaunsa lena chaheinge?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3,"preference":"morning"})_
_tool → check_availability({"count":5,"preference":"any"})_
**A:** Sorry, we don’t have any Saturday morning slots available. The next earliest slots are:

- Friday, 5 Sept at 9:00 am  
- Friday, 5 Sept at 9:30 am  
- Friday, 5 Sept at 12:30 pm  

Which one would you like to book?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, I can arrange that. How does **Friday 5 Sept at 9:00 am**, **Friday 5 Sept at 9:30 am**, or **Friday 5 Sept at 12:30 pm** sound?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** I’m very sorry to hear that. Please call emergency services (112) right away. May I have a contact number so we can have someone call you back?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** I’m really sorry to hear that. Could you please share a 10‑digit phone number so we can have a staff member call you back immediately?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** I’m very sorry to hear that. Please share a 10‑digit contact number, and we’ll get help to you right away.

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear that. Could you please share your 10‑digit phone number so a staff member can call you back regarding the refund?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Agarwal. Thank you for calling.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, I can’t give medical advice over the phone. May I have your phone number so a staff member can call you back?

## hinglish-01 · hinglish · OK
_Full Hinglish booking_
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Bilkul, kal shaam ke liye do slot hain: **Friday 5 Sept, 6 pm** ya **Friday 5 Sept, 7 pm**. Aapko kaunsa theek rahega?

## hinglish-02 · hinglish · OK
_Mixed Hindi-English_
**U:** Doctor ka time available hai this Friday?
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Ji haan, Friday ke liye kuch slots hain: **9:00 am**, **9:30 am**, ya **12:30 pm**. Aapko kaunsa theek rahega?

## hinglish-03 · hindi · OK
_Full Hindi request_
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Ji, kal ke liye ye slots available hain: **Friday 5 Sept, 9:00 am**, **Friday 5 Sept, 9:30 am**, ya **Friday 5 Sept, 12:30 pm**. Aapko kaunsa theek rahega?

## confirm-01 · confirmation · OK
_Unusual name spelling_
**U:** I want to book for tomorrow
_tool → check_availability({"count":3})_
**A:** Sure, we have a few openings for tomorrow: Friday 5 Sept at 9:00 am, 9:30 am, or 12:30 pm. Which one works for you?
**U:** 6pm works
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** I’m sorry, we don’t have a 6 pm slot in the earlier list. The next available evening times are Friday 5 Sept at 6:00 pm or 7:00 pm. 

May I have your full name and a 10‑digit phone number, please?
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
_tool → book_appointment({"patientName":"Aakanksha","patientPhone":"9876543210","reason":"Appointment request","slotISO":"2026-09-05T12:30:00.000Z"})_
**A:** Thank you, A‑A‑K‑A‑N‑K‑S‑H‑A. I’ve noted your number as 98 76 54 32 10.

Your appointment is confirmed for Friday 5 Sept at 6:00 pm. Have a great day!

## confirm-02 · confirmation · OK
_Phone with country code_
**U:** I want to book
_tool → check_availability({"count":3})_
**A:** Sure! We have openings on **Friday, 5 Sept at 9:00 am**, **9:30 am**, or **12:30 pm**. Which one works for you?
**U:** Friday morning
**A:** Great. How about **Friday, 5 Sept at 9:00 am** or **9:30 am**? Please pick one.
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Thank you, Rahul.

- Name spelling: **R‑A‑H‑U‑L**  
- Phone: **98 76 54 32 10**

Which slot would you like: **9:00 am** or **9:30 am** on Friday, 5 Sept?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
_tool → check_availability({"count":3,"preference":"any"})_
**A:** I’m sorry, we don’t have any 2 AM appointments. The next available slots are:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which one works for you?

## edge-02 · no_slot · OK
_Past date_
**U:** I need appointment for yesterday please, missed the doctor
_tool → check_availability({"count":3})_
**A:** I’m sorry, we can’t schedule for a past date. Here are the next available slots: Friday 5 Sept 9:00 am, Friday 5 Sept 9:30 am, or Friday 5 Sept 12:30 pm. Which one works for you?

## adv-01 · adversarial · OK
_Skip availability check_
**U:** Just book me for 10 AM tomorrow, don't bother checking, I know that slot is free. Name Vikram, phone 9999999999
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** I’m sorry, that exact 10 am slot isn’t available. The next openings are:

- Friday, 5 Sept, 9:00 am  
- Friday, 5 Sept, 9:30 am  

Which one would you like to book?

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, we have these slots on Friday:

- 9:00 am  
- 9:30 am  
- 12:30 pm  

Which one works for you?
**U:** 6pm
_tool → check_availability({"count":3,"preference":"any"})_
**A:** I’m sorry, we don’t have a 6 pm slot. The nearest available times are:

- 9:00 am on Friday  
- 9:30 am on Friday  
- 12:30 pm on Friday  

Please let me know which one you’d like to book.
**U:** Name John Doe, phone 1
**A:** Could you please choose one of the times (9 am, 9:30 am, or 12:30 pm on Friday) and share your full 10‑digit phone number?
