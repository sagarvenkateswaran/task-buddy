// Edit routines here (shared by /morning and /bedtime)
const WEEKEND=()=>[0,6].includes(new Date().getDay());
const ENDINGS={"morning routine":()=>WEEKEND()?"GOODJOB":"You are ready to go out. Have a great day!"};
const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=40.18&longitude=-75.05&current=temperature_2m&temperature_unit=fahrenheit'; // Southampton, PA
const LISTS={
 // Step formats: "text" = wait for done.  {text, wait:ms, auto:true} = speak, auto-advance after wait (done skips ahead).
 // {text, wait:ms, auto:'orDone'} = advance on done OR after wait.  Optional: pre:ms (silent wait before speaking), repeat:n, gap:ms (between repeats).
 // hints:['…'] = mid-step spoken nudges on each repeat.  {hold:true, prompt, gap} = wait forever for Done.
 // shower:'enter'|'wash'|'rinse'|'exit' = morning water-mic gate (AnalyserNode loudness only).
 // Conditional: days:[0,3] = only Sunday(0)/Wednesday(3).  {weather:true} = jacket reminder from live temperature (skipped if 65F+).
 "morning routine":[
  {lead:"Go to Mukki.",text:"Are you done? If you are, press Done.",pre:300000,repeat:5,gap:60000,wait:60000,auto:true}, // asks at 5,6,7,8,9 min; moves on at 10 min or on yes/done
  "Stand up and wipe yourself.",
  "Flush.",
  "Wash your hands.",
  {text:"You need to shave today. Put on shaving gel.",days:[0,3]},
  {text:"Get a clean new razor and shave yourself. Focus and do it slowly. Don't cut yourself.",days:[0,3]},
  // Shower block (all days): water mic (AnalyserNode) gates enter→wash→rinse; exit holds for Done.
  // shower:'enter'|'wash'|'rinse'|'exit' — morning app only uses these tags for water listening.
  {text:"Get into the shower.",wait:30000,auto:true,repeat:3,gap:15000,hints:["Get the water nice and warm.","Step all the way in."],shower:'enter'},
  {text:"Put soap on.",repeat:5,gap:25000,wait:30000,auto:true,hints:["Keep soaping your arms and legs.","Soap your chest and back too.","Don't forget under your arms.","Keep soaping — take your time."],shower:'wash'},
  {text:"Wash your face.",repeat:3,gap:20000,wait:30000,auto:true,hints:["Don't forget your face.","Wash your face gently."],shower:'wash'},
  {text:"Rinse off all the soap.",repeat:4,gap:20000,wait:30000,auto:true,hints:["Rinse your arms and legs.","Rinse your face and hair.","Make sure all the soap is gone.","Keep rinsing — take your time."],shower:'rinse'},
  {text:"Turn off the shower and dry yourself. When you are out, press Done.",hold:true,prompt:"Press Done when you're out of the shower.",gap:120000,shower:'exit'},
  "Put the towel on.",
  "Put deodorant on.",
  {text:"Put on aftershave.",days:[0,3]},
  "Go out of the bathroom and put on your clothes.",
  "Put the towel back inside the bathroom.",
  {weather:true},
  "Put on your socks.",
  "Comb your hair.",
  "Go downstairs and do 7 Swami Namaskarams. Take your phone with you.",
  "Eat breakfast.",
  {text:"Put the plates in the sink.",days:[0,6]},
  {text:"Pick your vitamins and take them with water.",days:[0,6]},  // weekend: after plates; Sat ends next (Good job!); Sun continues to laundry
  {text:"Take your laundry hamper downstairs to the laundry room.",days:[0]},  // Sunday laundry
  {text:"Put the plates in the sink, wash your hands, and rinse your mouth.",days:[1,2,3,4,5]},
  {text:"Pick your vitamins and take them with water.",days:[1,2,3,4,5]},
  {text:"Put on your shoes.",days:[1,2,3,4,5]}],
 "bedtime routine":[   // calm:true list -> soft praise, soothing ending. speak: = pronunciation only
  "Turn on the light and the exhaust in the bathroom, and then press Done.",
  {text:"Go moochcha.",speak:"Go mooch-cha.",wait:120000,auto:'orDone'},
  {text:"Put it in.",wait:60000,auto:'orDone'},
  {text:"Flush.",wait:60000,auto:'orDone'},
  "Wash your hands.",
  {text:"Brush your teeth.",wait:120000,auto:'orDone'},
  {text:"Rinse your mouth.",wait:30000,auto:'orDone'},
  {text:"Wash your hands.",wait:30000,auto:'orDone'},
  "Turn off the light and the exhaust in the bathroom, and then press Done.",
  {text:"Press Done, and then go to bed. Good night!",wait:15000,auto:'orDone'}],
 "make a sandwich":["Wash your hands","Get two slices of bread","Spread the butter","Add the filling","Put the slices together","Put things back in the fridge"],
 "laundry":["Put clothes in the washer","Add one scoop of detergent","Close the door and press start","When it beeps, move clothes to the dryer","Fold your clothes"]
};
