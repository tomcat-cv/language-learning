export type GrammarItem = { id:string; pattern:string; meaning:string; connection:string; example:string; translation:string; status:"new"|"learning"|"review" };
export type VocabularyItem = { id:string; word:string; reading:string; meaning:string; partOfSpeech:string; example:string; translation:string; status:"new"|"learning"|"review" };

export const grammarItems: GrammarItem[] = [
  {id:"g-001",pattern:"～は～です",meaning:"……是……",connection:"名词 + は + 名词 + です",example:"わたしは会社員です。",translation:"我是公司职员。",status:"learning"},
  {id:"g-002",pattern:"～ではありません",meaning:"……不是……",connection:"名词 + ではありません",example:"田中さんは学生ではありません。",translation:"田中先生不是学生。",status:"new"},
  {id:"g-003",pattern:"～の～",meaning:"所属、属性或修饰关系",connection:"名词 + の + 名词",example:"これは日本語の本です。",translation:"这是一本日语书。",status:"new"},
  {id:"g-004",pattern:"～も",meaning:"……也……",connection:"名词 + も",example:"わたしも中国人です。",translation:"我也是中国人。",status:"review"},
  {id:"g-005",pattern:"～か",meaning:"构成疑问句",connection:"句子 + か",example:"これはあなたの傘ですか。",translation:"这是你的伞吗？",status:"new"},
  {id:"g-006",pattern:"これ・それ・あれ",meaning:"这个、那个、那个",connection:"指示代词",example:"それは何ですか。",translation:"那是什么？",status:"new"},
];
export const vocabularyItems: VocabularyItem[] = [
  {id:"v-001",word:"私",reading:"わたし",meaning:"我",partOfSpeech:"代词",example:"私は李です。",translation:"我姓李。",status:"learning"},
  {id:"v-002",word:"学生",reading:"がくせい",meaning:"学生",partOfSpeech:"名词",example:"妹は学生です。",translation:"妹妹是学生。",status:"new"},
  {id:"v-003",word:"先生",reading:"せんせい",meaning:"老师；先生",partOfSpeech:"名词",example:"田中先生は日本人です。",translation:"田中老师是日本人。",status:"review"},
  {id:"v-004",word:"会社員",reading:"かいしゃいん",meaning:"公司职员",partOfSpeech:"名词",example:"父は会社員です。",translation:"父亲是公司职员。",status:"new"},
  {id:"v-005",word:"本",reading:"ほん",meaning:"书",partOfSpeech:"名词",example:"これは日本語の本です。",translation:"这是一本日语书。",status:"new"},
  {id:"v-006",word:"水",reading:"みず",meaning:"水",partOfSpeech:"名词",example:"水をください。",translation:"请给我水。",status:"new"},
];
export const hiragana = [["あ","a"],["い","i"],["う","u"],["え","e"],["お","o"],["か","ka"],["き","ki"],["く","ku"],["け","ke"],["こ","ko"],["さ","sa"],["し","shi"],["す","su"],["せ","se"],["そ","so"],["た","ta"],["ち","chi"],["つ","tsu"],["て","te"],["と","to"],["な","na"],["に","ni"],["ぬ","nu"],["ね","ne"],["の","no"]];
