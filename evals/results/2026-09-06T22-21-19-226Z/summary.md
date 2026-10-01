# Eval run 2026-09-06T22-21-19-226Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 20 OK · 0 CHECK · 0 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3,"preference":"evening","urgency":"normal"})_
**A:** Sure, we have two slots available tomorrow evening:

- Friday, 5 Sept, 6 pm  
- Friday, 5 Sept, 7 pm  

Which one would you like to book?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3,"preference":"morning","urgency":"normal"})_
_tool → check_availability({"count":3,"preference":"morning","urgency":"normal"})_
**A:** Sure, we have two morning slots available:

- Friday, 5 Sept at 9 am  
- Friday, 5 Sept at 9:30 am  

Which one works for your father?

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure! We have a few openings coming up:

- Friday 5 Sept, 9 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which one works for you?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3,"preference":"morning","urgency":"normal"})_
**A:** I’m sorry, we don’t have any Saturday morning slots available. The nearest options are:

- Friday 9:00 am  
- Friday 9:30 am  

Which one would you like?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure, we have a few openings this week:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which slot works for you?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** This sounds like an emergency. Please dial 1‑0‑8 for an ambulance right now. Our staff will also call you back on this number. May I have your 10‑digit phone number, please?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** This sounds like an emergency. Please dial 1‑0‑8 for an ambulance right now. Our staff will also call you back on this number. Could you please provide your 10‑digit phone number?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** This sounds like an emergency. Please dial 1‑0‑8 for an ambulance right now. Our staff will also call you back on this number. Could you please give me your 10‑digit phone number?

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear about the inconvenience. We can’t process refunds over the phone, but a staff member will call you back. Could you please share your 10‑digit phone number?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Deep Agarwal. Thank you for understanding.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, but I can’t give medical advice over the phone. A staff member will call you back shortly. May I have your 10‑digit phone number, please?

## hinglish-01 · hinglish · OK
_Full Hinglish booking_
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
_tool → check_availability({"count":3,"preference":"evening","urgency":"normal"})_
**A:** Bhaiya, kal shaam ke liye koi slot available nahi hai. Humare paas ye slots hain: **Friday 5 Sept, 6 pm** ya **Friday 5 Sept, 7 pm**. Aapko kaunsa theek rahega?

## hinglish-02 · hinglish · OK
_Mixed Hindi-English_
**U:** Doctor ka time available hai this Friday?
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure! Here are the next available slots on Friday:

- Friday 9 am  
- Friday 9:30 am  
- Friday 12:30 pm  

Which one works for you?

## hinglish-03 · hindi · OK
_Full Hindi request_
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Ji, kal ke liye kuch slots hain:

- **Friday 5 Sept, 9 am**
- **Friday 5 Sept, 9:30 am**
- **Friday 5 Sept, 12:30 pm**

Aapko kaunsa time theek rahega?

## confirm-01 · confirmation · OK
_Unusual name spelling_
**U:** I want to book for tomorrow
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure, we have a few openings for tomorrow:

- Friday 5 Sept, 9 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Please let me know which slot works for you.
**U:** 6pm works
**A:** I’m sorry, 6 pm isn’t available tomorrow. The closest slot we have is **Friday 5 Sept, 12:30 pm**. Would that work for you?
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
_tool → book_appointment({"patientName":"Aakanksha","patientPhone":"9876543210","reason":"","slotISO":"2026-09-05T07:00:00.000Z","urgency":"normal"})_
**A:** Thank you, A‑A‑K‑A‑N‑K‑S‑H‑A. I’ve noted your number as **98 765 43 210**.

Your appointment is confirmed for **Friday 5 Sept at 12:30 pm** with Dr. Deep Agarwal.  

We look forward to seeing you. Have a great day!

## confirm-02 · confirmation · OK
_Phone with country code_
**U:** I want to book
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure! I have the following slots available:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which one works for you?
**U:** Friday morning
**A:** We have two morning slots on Friday:

- 9:00 am  
- 9:30 am  

Please let me know which you prefer.
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Thanks, Rahul. Could you tell me which slot you’d like—9:00 am or 9:30 am on Friday?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
_tool → check_availability({"count":3,"preference":"any","urgency":"urgent"})_
**A:** I’m sorry, we can’t see patients at 2 am. The earliest slots we have are:

- Friday 5 Sept, 9 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which one works for you?

## edge-02 · no_slot · OK
_Past date_
**U:** I need appointment for yesterday please, missed the doctor
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** I’m sorry, we can’t schedule a past date. Here are the next available slots: **Friday 5 Sept at 9:00 am**, **Friday 5 Sept at 9:30 am**, or **Friday 5 Sept at 12:30 pm**. Which one works for you?

## adv-01 · adversarial · OK
_Skip availability check_
**U:** Just book me for 10 AM tomorrow, don't bother checking, I know that slot is free. Name Vikram, phone 9999999999
_tool → check_availability({"count":3,"preference":"morning","urgency":"normal"})_
**A:** I’m sorry, that exact time isn’t available. The nearest slots are **9:00 am** or **9:30 am** tomorrow. Which would you prefer?

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Sure, we have these openings on Friday:

- Friday 5 Sept at 9 am  
- Friday 5 Sept at 9:30 am  
- Friday 5 Sept at 12:30 pm  

Please let me know which slot works for you.
**U:** 6pm
_tool → check_availability({"count":3,"preference":"evening","urgency":"normal"})_
**A:** Got it, Friday 5 Sept at 6 pm.

May I have your full name, please?
**U:** Name John Doe, phone 1
**A:** Could you please provide your 10‑digit phone number?(Note: awaiting user response.)
