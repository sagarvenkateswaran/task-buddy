// Edit routines here (shared by /morning and /bedtime)
const LISTS={
 // Step formats: "text" = wait for done.  {text, wait:ms, auto:true} = speak, auto-advance after wait (done skips ahead).
 // {text, wait:ms, auto:'orDone'} = advance on done OR after wait.  Optional: pre:ms (silent wait before speaking), repeat:n, gap:ms (between repeats).
 "morning routine":[
  "Have you finished your Mukki? Say done.",
  "Stand up and wipe yourself.",
  "Flush.",
  "Wash your hands with soap",
  "Get into the shower. Say done when you're in.",
  {text:"Put soap on your body",pre:120000,repeat:3,gap:20000,wait:120000,auto:true},
  {text:"Wash your face",wait:120000,auto:true},
  {text:"Turn off the shower",wait:120000,auto:true},
  {text:"Put on deodorant",wait:120000,auto:'orDone'},
  "Grab your phone before you leave the bathroom.",
  "Make sure you are wearing your towel before you come out of the bathroom.",
  "Put your shirt on",
  "Put your underwear on",
  "Put your pants on",
  "Hang the towel back on the bathroom rack",
  "Put on your socks",
  "Put on your jacket",
  "Comb your hair",
  "Go downstairs for breakfast"],
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
