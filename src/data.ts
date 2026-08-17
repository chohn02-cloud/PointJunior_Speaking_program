import { Student, Unit } from "./types";

export const STUDENTS: Student[] = [
  // 관리자
  { name: "포인트", pw: "2384", cls: "관리자", unitIds: [1, 2, 3, 4] },
  // E.S.1반
  { name: "김태연", pw: "2847", cls: "E.S.1반", unitIds: [1, 2, 3, 4] },
  { name: "박주성", pw: "5193", cls: "E.S.1반", unitIds: [1, 2, 3, 4] },
  { name: "정진호", pw: "7362", cls: "E.S.1반", unitIds: [1, 2, 3, 4] },
  { name: "한바로", pw: "4815", cls: "E.S.1반", unitIds: [1, 2, 3, 4] },
  { name: "안서윤", pw: "9274", cls: "E.S.1반", unitIds: [1, 2, 3, 4] },
  { name: "강민서", pw: "6531", cls: "E.S.1반", unitIds: [1, 2, 3, 4] },
  // E.S.2반
  { name: "김지안", pw: "3726", cls: "E.S.2반", unitIds: [1, 2, 3, 4] },
  { name: "백지선", pw: "8149", cls: "E.S.2반", unitIds: [1, 2, 3, 4] },
  { name: "김승아", pw: "5083", cls: "E.S.2반", unitIds: [1, 2, 3, 4] },
  // E.S.3반
  { name: "정선우", pw: "7418", cls: "E.S.3반", unitIds: [1, 2, 3, 4] },
  // P-E.S반
  { name: "강준서", pw: "2963", cls: "P-E.S반", unitIds: [1, 2, 3, 4] },
];

export const UNITS: Unit[] = [
  {
    id: 1,
    name: "4/3 Script",
    emoji: "📖",
    classes: ["E.S.1반", "E.S.2반", "E.S.3반", "P-E.S반"],
    dialogues: [
      { lines: ["I'm kind of nervous about going into the haunted house.", "Don't worry. We can hold hands if you want.", "Thanks. I'm happy with that idea!"] },
      { lines: ["He is going to hold a meeting in 5 minutes. Can you wait?", "Sure. I'm decent at waiting patiently."] },
      { lines: ["Can you hold my bag for a second?", "Sure. Are you going to move that heavy box?", "Yes, but I'm terrible at carrying heavy things.", "Don't worry. I'm okay with helping you!"] },
      { lines: ["I'm dying to tell you a secret!", "Tell me right now! Don't hold back.", "Well, I'm bad at keeping secrets. I'm getting a new puppy!", "Wow! That's good to hear!"] },
      { lines: ["Hurry up! The movie is starting!", "Hold on! I need to buy some popcorn.", "Come on, I'm about to go inside without you.", "Okay, okay. I'm ready to go now."] },
      { lines: ["What is holding up our pizza delivery?", "I don't know, but I'm dying to eat it!", "Me too. I'm terrible at being patient when I'm hungry."] },
      { lines: ["Did you hear about Alex? He will hold a position on the student council.", "That's awesome. I'm great at organizing events, so I want to join too.", "Go for it! I'm kind of thinking about joining myself."] },
      { lines: ["I'm bad at talking to new people.", "Really? But you can hold a conversation so well!", "Thanks. I guess I'm decent at asking questions, at least."] },
      { lines: ["I'm here to help you decorate the room.", "Thanks! We are going to hold a party tonight.", "Awesome. I'm ready to blow up all these balloons!"] },
      { lines: ["Look at that diver! He can hold his breath for three minutes.", "Wow, I'm about to try it right now.", "Be careful! Not everyone is good at it."] }
    ]
  },
  {
    id: 2,
    name: "4/17 Script",
    emoji: "📖",
    classes: ["E.S.1반", "E.S.2반", "E.S.3반", "P-E.S반"],
    dialogues: [
      { lines: ["Do you know where the glue is?", "I think we ran out of glue during the last art class.", "Oh, I see. Do you want to go to the store with me?", "Sure! Let's go and buy two bottles just in case."] },
      { lines: ["Do you remember my cousin, Minho?", "Yes, why? Did you see him?", "Yeah, I ran into him at the library this morning.", "Did he study hard?", "Not really. He was just looking for some comic books."] },
      { lines: ["Do you feel like playing at the playground?", "Sure! Let's play tag. You have to run after me!", "Okay, get ready. I'm very fast!", "We'll see. You can't catch me even if you run all day!"] },
      { lines: ["Do you know how to stop a hamster from running away?", "You should keep the cage door closed all the time.", "Thanks for the tip. I don't want to lose my pet.", "Really? Then do you want to put a small heavy book on top?"] },
      { lines: ["Do you have any special plans for this evening?", "I'm going to a concert, but I'm worried it might run long.", "Don't worry. Do you prefer taking a taxi or the subway home?", "I think the subway is safer, but I hope the concert ends early."] },
      { lines: ["Wake up! We are running behind schedule for the field trip.", "Oh, no! Do you want to skip breakfast and just go?", "No, let's just eat something simple and hurry up.", "Okay, let's grab our bags and get out of here quickly!"] },
      { lines: ["Do you know how to use this new vending machine?", "Let me run through the steps with you one more time.", "Thanks. Do you remember which button I should press first?", "First, put in the money, and then choose your favorite drink."] },
      { lines: ["Do you want to run for class president this semester?", "I'm thinking about it, but I'm a little bit nervous.", "Don't be! Do you know that everyone thinks you're a great leader?", "Thanks for saying that. I will try my best to win."] },
      { lines: ["Do you have any special plans for the class party tomorrow?", "I'm making some lemonade, but I'm running short of sugar.", "Do you want me to bring some sugar from my house?", "That would be great! Thank you so much for your help."] },
      { lines: ["Do you remember that old comic book I lost last month?", "Yes, you were so sad back then. Did you find it?", "I ran across it while I was cleaning under my bed yesterday.", "Wow, that's lucky! Do you want to lend it to me later?"] },
      { lines: ["Do you know how to run a business, like a small cafe?", "No, but my mom does because she owns a bakery.", "That's cool. Do you prefer helping her or just eating the bread?", "To be honest, I like eating the delicious bread the most!"] },
      { lines: ["Do you know that we need to run over our dance moves again?", "Yes, the school performance is tomorrow afternoon.", "Do you feel like practicing in the dance room for one more hour?", "Sure, let's make sure we don't make any mistakes on stage."] },
      { lines: ["Do you prefer drinking sweet soda or just plain water?", "I like soda, but water is better for your skin in the long run.", "You're right. Do you know that drinking water gives you more energy?", "I heard that too. Let's try to drink more water from now on."] },
      { lines: ["I have a great new idea for our group project topic.", "Sounds interesting! Do you want to tell me more about it?", "Let's run it by the teacher first to see if it's too difficult.", "Good idea. If she says yes, we can start working on it today."] },
      { lines: ["Do you know why Minji ran ahead of us so suddenly?", "She said she wanted to get the best window seats in the cafeteria.", "Oh! Do you want to run with me too so we can sit together?", "Yes! Let's go before all the good seats are taken by others."] }
    ]
  },
  {
    id: 3,
    name: "5/1 Script",
    emoji: "📖",
    classes: ["E.S.1반", "E.S.2반", "E.S.3반", "P-E.S반"],
    dialogues: [
      { lines: ["I'm gonna wake up early tomorrow to catch the first train to Seoul.", "Would you like to go together? I need to buy some books at the mall anyway.", "That sounds perfect. I was wondering if you could call me at 6 AM just in case.", "Sure. Please remind me to charge my phone tonight so it doesn't die."] },
      { lines: ["I wanna sit down and rest for a while. My legs are so tired.", "Me too. Would you like to go to that new cafe across the street?", "That sounds perfect. I'd like to try their strawberry cake.", "Great! Let's go there and have a relaxing time."] },
      { lines: ["It's already 8 o'clock! You've gotta get up right now.", "Oh, no. I'd like to sleep for ten more minutes.", "You're gonna be late for school if you don't hurry.", "Okay, okay. I'm getting out of bed now."] },
      { lines: ["It's getting dark in here. I wanna turn on the lights.", "Good idea. Would you like some help with the curtains, too?", "Yes, please. I'd like to make the room very bright.", "No problem. I'll open the curtains for you right now."] },
      { lines: ["I have a headache, so I've gotta lie down for a second.", "Would you like some warm water or medicine?", "I'd like some water, please. I think I just need a short rest.", "Okay. I'm gonna make the room quiet so you can sleep."] },
      { lines: ["Everyone, you've gotta stand up and cheer for our team!", "I'm gonna shout as loud as I can! They are winning!", "Would you like to wave this big flag with me?", "Yes! I'd like to show our team that we are supporting them."] },
      { lines: ["I'd like to go to the flower market early tomorrow morning.", "What time do you wanna wake up?", "I'm gonna set my alarm for 5 AM. Is that okay?", "Wow, you've gotta be very tired tomorrow, but I'll go with you."] },
      { lines: ["You look very busy. You've gotta sit down and take a break.", "I have so many things to do. I wanna finish this work quickly.", "Would you like some chocolate? It will give you some energy.", "Thanks! I'd like some dark chocolate if you have any."] },
      { lines: ["I'm gonna turn on the TV. The big soccer game is starting.", "Would you like to order some fried chicken to eat together?", "That's a great idea! I'd like some spicy chicken today.", "Okay. I wanna try the new menu from that chicken place."] },
      { lines: ["I'm gonna turn on the radio now. It helps me wake up faster.", "Good idea, but you've gotta get up from the bed first! You're still half-asleep.", "I know, I know. I'd like to lie down for just five more minutes, though.", "No way! Would you like to miss the bus again? Stand up and get ready!", "Fine. I wanna have some cereal. Would you like some, too?", "Yes, please. Let's sit down and eat quickly. We have to leave in ten minutes!"] }
    ]
  },
  {
    id: 4,
    name: "5/8 Script",
    emoji: "📖",
    classes: ["E.S.1반", "E.S.2반", "E.S.3반", "P-E.S반"],
    dialogues: [
      { lines: ["Welcome to my house! Please come in and make yourself comfortable.", "Thank you for inviting me. Should I take off my shoes here?", "Yes, please. Would you like some warm tea? It's a bit chilly outside today.", "I'd like some green tea, if you don't mind. It smells wonderful in here!"] },
      { lines: ["Where would you like to go first for our city tour this afternoon?", "I'd like to look around the traditional market and pick up some souvenirs for my parents.", "That's a great plan. Don't forget to keep your wallet safe in the crowded area.", "Thanks for the tip. I'll make sure to hold onto my bag tightly."] },
      { lines: ["Would you mind putting away your books on the table? I need space for lunch.", "Not at all. Actually, I was looking for my bookmark before I cleaned up.", "Oh, is it this blue one under the chair? Let me pick it up for you.", "Yes, that's it! Thank you. I'd like to finish this chapter before we eat."] },
      { lines: ["What would you like to do after we finish looking at these paintings?", "I'd like to sit on that bench and just relax for a moment.", "Sounds good. Why don't you put down that heavy backpack first?", "Good idea. Don't be surprised if I fall asleep; this museum is so quiet!"] },
      { lines: ["I've gotta go out for an hour. Would you like to look after my puppy while I'm gone?", "Of course! I love dogs. What do I need to do?", "Don't forget to give him some water if he barks, and don't be late for his snack time.", "Don't worry. I'd like to take him for a short walk in the garden, too."] },
      { lines: ["Look out! There is some wet paint on that bench.", "Oh, thank you! Would you mind checking if I got any on my coat?", "It looks clean, but you should take it off and check the back just in case.", "You're right. I guess I was too busy looking at my phone to notice the sign."] },
      { lines: ["What are you trying to find in the kitchen cabinet?", "I'm looking for some flour to make cookies. Would you like some homemade cookies?", "I'd love some! Don't be too messy, though. Please remind me to help you put away the dishes later.", "Don't worry, I'll clean up as I go. I'd like to make them extra sweet for you."] },
      { lines: ["This department store is huge. Where would you like to start?", "I'd like to look around the electronics floor first. I need a new mouse.", "Okay. After that, don't forget to pick up some milk on the ground floor.", "Right. Would you mind holding this shopping bag for a second while I tie my shoes?"] },
      { lines: ["I'm gonna take off my heavy coat now that we are inside.", "Make yourself at home. Would you like to come in the kitchen and help me with lunch?", "Sure. Don't be afraid to give me a lot of tasks; I'm a good cook!", "Great. What would you like to make? I have some fresh pasta and vegetables."] },
      { lines: ["Wow, the air is so fresh here! Where would you like to set up our tent?", "I'd like to stay near that big tree. Would you mind picking up those heavy poles for me?", "Not at all. But don't forget to look out for those sharp rocks on the ground.", "Thanks. After we finish, I'm gonna take off my boots and look around the creek."] }
    ]
  }
];
