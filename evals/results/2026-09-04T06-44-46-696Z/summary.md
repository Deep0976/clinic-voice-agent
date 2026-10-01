# Eval run 2026-09-04T06-44-46-696Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 19 OK · 1 CHECK · 0 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Sure, we have two slots available tomorrow evening: Friday 5 Sept at 6:00 pm, or Friday 5 Sept at 7:00 pm. Which one would you prefer?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** Sure, we have two morning slots tomorrow: Friday 9:00 am or Friday 9:30 am. Which one would you like?

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Ji, sabse jaldi slot yeh hain: **Friday 5 September, 9:00 am** ya **9:30 am** ya **12:30 pm**. Aap kaunsa lena chaheinge?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** I’m sorry, we don’t have any Saturday morning slots available. The next earliest morning slots are:

- Friday 5 Sept 9:00 am  
- Friday 5 Sept 9:30 am  

Please let me know which one works for you.

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, let’s get you in. How about **Friday 5 Sept 9:00 am**, **Friday 5 Sept 9:30 am**, or **Friday 5 Sept 12:30 pm**?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** I’m very sorry to hear that. This sounds urgent—please have a family member call an ambulance right away. Could you share a contact number so a staff member can call you back as soon as possible?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** I’m really sorry to hear that. May I have your phone number so we can have a doctor call you back immediately?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** I’m very sorry to hear that. Please share your 10‑digit phone number, and we’ll have someone call you right away.

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear that. Could you please share your 10‑digit phone number so our team can get back to you?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Agarwal. Thank you for calling.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, I can’t give medical advice. A staff member will call you back. Could you please share your 10‑digit phone number?

## hinglish-01 · hinglish · OK
_Full Hinglish booking_
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Samajh gaya, bhaiya. Kal shaam ke liye do slots hain:

- **Friday 5 September, 6:00 pm**  
- **Friday 5 September, 7:00 pm**

Aapko kaunsa time theek rahega?

## hinglish-02 · hinglish · OK
_Mixed Hindi-English_
**U:** Doctor ka time available hai this Friday?
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Doctor ka time Friday ko available hai: 9:00 am, 9:30 am, ya 12:30 pm. Aap kaunsa slot lena chaheinge?

## hinglish-03 · hindi · OK
_Full Hindi request_
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
_tool → check_availability({"count":3})_
**A:** Ji, kal ke liye kuch slot hain: **9:00 am**, **9:30 am**, ya **12:30 pm**. Aapko kaunsa theek rahega?

## confirm-01 · confirmation · CHECK
_Unusual name spelling_
- ❌ missing tools: book_appointment
**U:** I want to book for tomorrow
_tool → check_availability({"count":3})_
**A:** Sure, I have the following slots for tomorrow:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which one works for you?
**U:** 6pm works
**A:** I’m sorry, we don’t have a 6 pm slot tomorrow. The nearest available times are:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Please let me know which one you’d like to book.
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
**A:** Thank you, Aakanksha. Which of these slots would you like to confirm?

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

## confirm-02 · confirmation · OK
_Phone with country code_
**U:** I want to book
**A:** Sure! Do you have a preferred time of day—morning, afternoon, or evening?
**U:** Friday morning
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** We have Friday at 9:00 am or Friday at 9:30 am. Which slot would you like?
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Thanks, Rahul. Could you let me know which slot you’d prefer—Friday 9:00 am or Friday 9:30 am?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
_tool → check_availability({"count":3,"preference":"any"})_
**A:** I’m sorry, we don’t take appointments at 2 am. The next available slots are:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

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
**A:** I’m sorry, the 10 am slot tomorrow isn’t available. The nearest slots are 9:00 am or 9:30 am. Which one would you prefer?

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, we have the following slots on Friday:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Which one works for you?
**U:** 6pm
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** I’m sorry, we don’t have a 6 pm slot today. The nearest evening times are:

- Friday 5 Sept, 6:00 pm  
- Friday 5 Sept, 7:00 pm  

Would you like to book one of these?
**U:** Name John Doe, phone 1
**A:** Could you please provide your full 10‑digit phone number?
