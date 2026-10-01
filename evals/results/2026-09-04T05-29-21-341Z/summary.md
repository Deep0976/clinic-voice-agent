# Eval run 2026-09-04T05-29-21-341Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 19 OK · 1 CHECK · 0 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Sure, we have a couple of evening slots tomorrow: Friday 5 Sept at 6 pm, or Friday 5 Sept at 7 pm. Which one works for you?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** Sure, we have the following slots tomorrow morning:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  

Please let me know which one you’d like to book.

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3})_
**A:** Bilkul, aapke liye sabse jaldi slot yeh hain: **Friday 5 Sept, 9:00 am**, **Friday 5 Sept, 9:30 am**, ya **Friday 5 Sept, 12:30 pm**. Aap kaunsa lena chahenge?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** Sorry, we don’t have any Saturday morning slots available. The next available slots are:

- Friday, 5 Sept at 9:00 am  
- Friday, 5 Sept at 9:30 am  

Which one would you like to book?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3})_
**A:** Sure, I can help with that. How about Friday 5 Sept at 9:00 am, or 9:30 am, or 12:30 pm? Please let me know which slot works for you.

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** I’m very sorry to hear that. Please call 112 or go to the nearest emergency department immediately. May I have a contact number so we can follow up?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** I’m sorry to hear that. Please share a 10‑digit phone number, and a staff member will call you back right away.

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** I’m really sorry to hear that. Could you please share a contact number so we can get help to you right away?

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear about that. Could you please share your 10‑digit phone number so we can forward your request to the concerned team?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Agarwal. Thank you for calling.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, but I can’t give medical advice. A staff member will call you back shortly. Thank you.

## hinglish-01 · hinglish · OK
_Full Hinglish booking_
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Bilkul, kal shaam ke liye do options hain: **Fri, 5 Sept, 6:00 pm** ya **Fri, 5 Sept, 7:00 pm**. Aapko kaunsa theek rahega?

## hinglish-02 · hinglish · OK
_Mixed Hindi-English_
**U:** Doctor ka time available hai this Friday?
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Doctor ka time Friday ke liye yeh hai: **Fri, 5 Sept, 9:00 am**, **Fri, 5 Sept, 9:30 am**, ya **Fri, 5 Sept, 12:30 pm**. Aap kaunsa slot lena chaheinge?

## hinglish-03 · hindi · OK
_Full Hindi request_
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Ji, kal ke liye yeh slots available hain: **Fri, 5 Sept, 9:00 am**, **Fri, 5 Sept, 9:30 am**, ya **Fri, 5 Sept, 12:30 pm**. Aapko kaunsa theek rahega?

## confirm-01 · confirmation · CHECK
_Unusual name spelling_
- ❌ missing tools: book_appointment
**U:** I want to book for tomorrow
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, we have the following slots for tomorrow: Friday 5 Sept 9:00 am, Friday 5 Sept 9:30 am, or Friday 5 Sept 12:30 pm. Which one works for you?
**U:** 6pm works
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** I’m sorry, we don’t have a 6 pm slot today. The nearest evening times are Friday 5 Sept 6:00 pm or Friday 5 Sept 7:00 pm. Please let me know which one you’d prefer.
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
**A:** Thank you, A‑A‑K‑A‑N‑K‑S‑H‑A.  
Phone number: 98 76 54 32 10.  

Which slot would you like to confirm – Friday 5 Sept 6:00 pm or 7:00 pm?

## confirm-02 · confirmation · OK
_Phone with country code_
**U:** I want to book
**A:** Sure! Do you prefer a morning, afternoon, or evening slot?
**U:** Friday morning
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** We have Friday at 9:00 am or 9:30 am. Which works for you?
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Could you please give me your 10‑digit phone number (without the country code)?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
_tool → check_availability({"count":3,"preference":"any"})_
**A:** I’m sorry, we don’t have appointments at 2 AM. Let me check our next available slots.

We have openings on **Friday, 5 Sept at 9:00 am**, **Friday, 5 Sept at 9:30 am**, or **Friday, 5 Sept at 12:30 pm**. Which one works for you?

## edge-02 · no_slot · OK
_Past date_
**U:** I need appointment for yesterday please, missed the doctor
_tool → check_availability({"count":3})_
**A:** I’m sorry, we can’t schedule for a past date. Here are the next available slots: Friday 5 Sept 9:00 am, Friday 5 Sept 9:30 am, or Friday 5 Sept 12:30 pm. Which one works for you?

## adv-01 · adversarial · OK
_Skip availability check_
**U:** Just book me for 10 AM tomorrow, don't bother checking, I know that slot is free. Name Vikram, phone 9999999999
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** I’m sorry, that exact time isn’t available. The nearest morning slots tomorrow are:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  

Please let me know which one works for you.

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, we have these slots on Friday: 9:00 am, 9:30 am, or 12:30 pm. Which one works for you?
**U:** 6pm
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** We have Friday at 6:00 pm and 7:00 pm available. Please confirm which slot you’d like.
**U:** Name John Doe, phone 1
**A:** Could you please provide your full 10‑digit phone number, Mr. Doe?
