// Edit routines here (shared by /morning and /bedtime)
const ENDINGS={"morning routine":"You are ready to go out. Have a great day!"};
const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=40.18&longitude=-75.05&current=temperature_2m&temperature_unit=fahrenheit'; // Southampton, PA
const LISTS={
 // Step formats: "text" = wait for done.  {text, wait:ms, auto:true} = speak, auto-advance after wait (done skips ahead).
 // {text, wait:ms, auto:'orDone'} = advance on done OR after wait.  Optional: pre:ms (silent wait before speaking), repeat:n, gap:ms (between repeats).
 // Conditional: days:[0,3] = only Sunday(0)/Wednesday(3).  {weather:true} = jacket reminder from live temperature (skipped if 65F+).
 "morning routine":[
  {lead:"Go to Mukki.",text:"Are you done?",pre:300000,repeat:5,gap:60000,wait:60000,auto:true}, // asks at 5,6,7,8,9 min; moves on at 10 min or on yes/done
  "Stand up and wipe yourself.",
  "Flush.",
  "Wash your hands.",
  {text:"You need to shave today. Put on shaving gel.",days:[0,3]},
  {text:"Get a clean new razor and shave yourself. Focus and do it slowly. Don't cut yourself.",days:[0,3]},
  {text:"Get into the shower.",wait:30000,auto:true},
  {text:"Put soap on.",repeat:4,gap:30000,wait:30000,auto:true},   // said at 0,30,60,90s; advances at 2 min
  {text:"Wash your face.",wait:60000,auto:true},
  {text:"Turn off the shower.",wait:15000,auto:true},
  {text:"Dry yourself with the towel.",wait:45000,auto:true},
  "Put the towel on.",
  "Put deodorant on.",
  {text:"Put on aftershave.",days:[0,3]},
  "Go out of the bathroom and put on your clothes.",
  "Put the towel back inside the bathroom.",
  {weather:true},
  "Put on your socks.",
  "Did you comb your hair?",
  "Go downstairs and do 7 Swami Namaskarams. Take your phone with you.",
  "Eat breakfast.",
  "Put the plates in the sink, wash your hands, and rinse your mouth.",
  "Put on your shoes."],
 "bedtime routine":[   // calm:true list -> soft praise, soothing ending. speak: = pronunciation only
  {text:"Go moochcha.",speak:"Go mooch-cha.",wait:120000,auto:'orDone'},
  {text:"Put it in.",wait:60000,auto:'orDone'},
  {text:"Flush.",wait:60000,auto:'orDone'},
  "Wash your hands.",
  {text:"Brush your teeth.",wait:120000,auto:'orDone'},
  {text:"Rinse your mouth.",wait:30000,auto:'orDone'},
  {text:"Wash your hands.",wait:30000,auto:'orDone'},
  {text:"Go to bed. Good night!",wait:15000,auto:'orDone'}],
 "make a sandwich":["Wash your hands","Get two slices of bread","Spread the butter","Add the filling","Put the slices together","Put things back in the fridge"],
 "laundry":["Put clothes in the washer","Add one scoop of detergent","Close the door and press start","When it beeps, move clothes to the dryer","Fold your clothes"]
};
