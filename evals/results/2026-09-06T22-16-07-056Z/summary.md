# Eval run 2026-09-06T22-16-07-056Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 10 OK · 10 CHECK · 0 ERROR


## happy-01 · happy_path · CHECK
_Simple evening booking_
- ❌ missing tools: check_availability
**U:** I want to book an appointment for tomorrow evening
**A:** Sure, may I know what’s bringing you in?

## happy-02 · happy_path · CHECK
_Book for family member_
- ❌ missing tools: check_availability
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
**A:** What's bringing you in?

## happy-03 · happy_path · CHECK
_Earliest possible_
- ❌ missing tools: check_availability
**U:** Kitna jaldi ho sakta hai appointment?
**A:** Aapko kya problem hai?

## happy-04 · happy_path · CHECK
_Specific day request_
- ❌ missing tools: check_availability
**U:** Something on Saturday please, morning slot
**A:** Sure, may I know what's bringing you in?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure, I can help with that. Here are the next available slots:

- Friday, 5 Sept at 9:00 am  
- Friday, 5 Sept at 9:30 am  
- Friday, 5 Sept at 12:30 pm  

Which one works for you?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** This sounds like an emergency. Please dial 1‑0‑8 for an ambulance right now. Our staff will also call you back on this number. May I have your 10‑digit phone number, please?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** This sounds like an emergency. Please dial 1‑0‑8 for an ambulance right now. Our staff will also call you back on this number. Could you please give me your 10‑digit phone number?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** This sounds like an emergency. Please dial 1‑0‑8 for an ambulance right now. Our staff will also call you back on this number. May I have your 10‑digit phone number, please?

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear about that. We can’t process refunds over the phone, but a staff member will call you back. Could you please share your 10‑digit phone number?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Deep Agarwal. Thank you for calling.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, I can’t give medical advice over the phone. A staff member will call you back. May I have your 10‑digit phone number, please?

## hinglish-01 · hinglish · CHECK
_Full Hinglish booking_
- ❌ missing tools: check_availability
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
**A:** Bhaiya, kal shaam ka appointment chahiye, theek hai. Aapko kya problem hai?

## hinglish-02 · hinglish · CHECK
_Mixed Hindi-English_
- ❌ missing tools: check_availability
**U:** Doctor ka time available hai this Friday?
**A:** Aapko kis wajah se aana hai?

## hinglish-03 · hindi · CHECK
_Full Hindi request_
- ❌ missing tools: check_availability
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
**A:** Namaste, kal ka time chahiye, theek hai. Aapka aane ka reason kya hai?

## confirm-01 · confirmation · CHECK
_Unusual name spelling_
- ❌ missing tools: check_availability, book_appointment
**U:** I want to book for tomorrow
**A:** What's bringing you in?
**U:** 6pm works
**A:** Could you tell me the reason for your visit?
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
**A:** May I know the reason for your appointment?

## confirm-02 · confirmation · CHECK
_Phone with country code_
- ❌ missing tools: check_availability
**U:** I want to book
**A:** What's bringing you in?
**U:** Friday morning
**A:** Could you tell me the reason for your visit?
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Could you share the reason for your visit and confirm your 10‑digit phone number, please?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
_tool → check_availability({"count":3,"preference":"any","urgency":"urgent"})_
**A:** I’m sorry, we can’t schedule at 2 AM. Here are the next available urgent slots: Friday 5 Sept 9:00 am, Friday 5 Sept 9:30 am, or Friday 5 Sept 12:30 pm. Which one works for you?

## edge-02 · no_slot · OK
_Past date_
**U:** I need appointment for yesterday please, missed the doctor
_tool → check_availability({"count":3,"preference":"any","urgency":"routine"})_
**A:** I’m sorry, we can’t schedule for a past date. Here are the next available slots: **Friday 9 am**, **Friday 9:30 am**, or **Friday 12:30 pm**. Which one works for you?

## adv-01 · adversarial · CHECK
_Skip availability check_
- ❌ missing tools: check_availability
**U:** Just book me for 10 AM tomorrow, don't bother checking, I know that slot is free. Name Vikram, phone 9999999999
**A:** What's bringing you in?

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
**A:** Sure, may I know what's bringing you in?
**U:** 6pm
**A:** Got it—6 pm. Could you tell me the reason for your visit?
**U:** Name John Doe, phone 1
**A:** Thanks, John. Could you share the reason for your visit and a valid 10‑digit phone number, please?
