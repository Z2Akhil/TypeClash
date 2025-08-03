const CHARSETS = {
  easy: 'abcdefghijklmnopqrstuvwxyz ',
  medium: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
  hard: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*()_+-=;:,.<>?',
};

// A small list of actual words for better practice text
const easyWords = "the of to and a in is it you that he was for on are with as I his they be at one have this from or had by hot but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them would write like so these her long make thing see him two has look more day could go come did my sound no most number who over know water than call first people may down side been now find".split(" ");

export function generateRandomText(difficulty, wordCount = 40) {
  if (difficulty === 'easy') {
    let words = [];
    for (let i = 0; i < wordCount; i++) {
        words.push(easyWords[Math.floor(Math.random() * easyWords.length)]);
    }
    return words.join(' ');
  }

  const charset = CHARSETS[difficulty] || CHARSETS.medium;
  let text = '';
  for (let i = 0; i < wordCount; i++) {
    const wordLength = Math.floor(Math.random() * 6) + 3; // words between 3-8 chars
    let word = '';
    for (let j = 0; j < wordLength; j++) {
      word += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    text += word.trim() + ' '; // Ensure no leading/trailing spaces in the word itself
  }
  return text.trim();
}
