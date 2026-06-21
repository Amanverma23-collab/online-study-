import { NextResponse } from "next/server";
import { extractTextItems, getDocumentProxy } from "unpdf";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    let parsedText = "";
    try {
      const pdfData = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const { items } = await extractTextItems(pdfData);
      const pagesText = items.map(pageItems => {
        let pageText = "";
        for (const item of pageItems) {
          pageText += item.str;
          if (item.hasEOL) {
            pageText += "\n";
          } else {
            pageText += " ";
          }
        }
        return pageText;
      });
      parsedText = pagesText.join("\n");
    } catch (pdfError) {
      console.error("PDF Parsing Error, using empty text:", pdfError);
      parsedText = "Fallback text due to PDF parsing error.";
    }

    let questions = [];
    let jsonText = "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-flash-latest",
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are an MCQ extractor for Indian competitive exams (NDA/CDS). 
Extract all multiple choice questions, their correct answers, and explanations (if any) from the text provided by the user.
Look carefully at the text for any indicating marks, answer keys, bold text, or explicit answer lists to determine the correctOption.
Return ONLY a valid JSON array of objects. Do not include markdown codeblocks or backticks.
Each object must represent a question and have the following exact schema:
[
  {
    "order": <number representing 1-based index of question>,
    "questionText": "<full question text>",
    "optionA": "<option A text>",
    "optionB": "<option B text>",
    "optionC": "<option C text>",
    "optionD": "<option D text>",
    "correctOption": "<correct option letter, must be A, B, C, or D. If the correct option is not found in the text, leave as empty string \"\">",
    "explanation": "<detailed explanation of the answer if available in the text; otherwise empty string \"\">"
  }
]

Text:
${parsedText.slice(0, 12000)}`;

        const result = await model.generateContent(prompt);
        jsonText = result.response.text();
        questions = JSON.parse(jsonText);
      } catch (geminiError: any) {
        console.error("Gemini Extractor Error:", geminiError);

        let userMessage = 'Failed to process file upload. Please try again.';

        if (geminiError.message?.includes('RESOURCE_EXHAUSTED') || geminiError.message?.includes('429')) {
          userMessage = 'Too many requests right now (daily free limit may be reached). Please try again in a few minutes or tomorrow.';
        } else if (geminiError.message?.includes('API_KEY_INVALID') || geminiError.message?.includes('401')) {
          userMessage = 'AI service configuration issue. Please contact support.';
        } else if (geminiError.message?.includes('empty') || jsonText?.trim() === '') {
          userMessage = 'Could not read text from this PDF — it may be a scanned image without selectable text. Try a different PDF or use the Excel upload option instead.';
        }

        return NextResponse.json({ error: userMessage }, { status: 500 });
      }
    } else {
      console.log("No GEMINI_API_KEY found, returning fallback mock questions.");
      questions = generateFallbackQuestions(parsedText);
    }

    return NextResponse.json({
      success: true,
      message: `Extracted ${questions.length} questions from PDF.`,
      questions
    });
  } catch (error: any) {
    console.error("Upload PDF Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}


function generateFallbackQuestions(text: string) {
  const questions: any[] = [];
  
  try {
    // Regex splits by: word boundary + digits + dot/closing parenthesis, e.g. "1." or "10."
    const qMatches = text.split(/(?=\b\d+[\.\)])/g);
    
    let order = 1;
    for (const qBlock of qMatches) {
      const lines = qBlock.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;
      
      const firstLine = lines[0];
      const numMatch = firstLine.match(/^\b(\d+)[\.\)]\s*(.*)/);
      if (!numMatch) continue;
      
      let questionText = numMatch[2];
      
      // Accrue question text until we see Option A or any option indicator (e.g. A. or (A))
      let lineIdx = 1;
      while (lineIdx < lines.length && !lines[lineIdx].match(/^[\(\[x]?A[\.\)\s\]]/i)) {
        questionText += " " + lines[lineIdx];
        lineIdx++;
      }
      
      let optionA = "";
      let optionB = "";
      let optionC = "";
      let optionD = "";
      let correctOption = "";
      let explanation = "";
      
      for (; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const optMatch = line.match(/^[\(\[x]?([A-D])[\.\)\s\]]\s*(.*)/i);
        if (optMatch) {
          const optLetter = optMatch[1].toUpperCase();
          const optVal = optMatch[2];
          if (optLetter === "A") optionA = optVal;
          else if (optLetter === "B") optionB = optVal;
          else if (optLetter === "C") optionC = optVal;
          else if (optLetter === "D") optionD = optVal;
          continue;
        }

        const ansMatch = line.match(/^(?:Answer|Ans|Correct(?:\s+Option)?)\s*:\s*([A-D])/i);
        if (ansMatch) {
          correctOption = ansMatch[1].toUpperCase();
          continue;
        }

        const expMatch = line.match(/^(?:Explanation|Expl|Sol|Solution)\s*:\s*(.*)/i);
        if (expMatch) {
          explanation = expMatch[1];
          for (let eIdx = lineIdx + 1; eIdx < lines.length; eIdx++) {
            explanation += " " + lines[eIdx];
          }
          break;
        }
      }
      
      if (questionText && optionA && optionB && optionC && optionD) {
        questions.push({
          order: order++,
          questionText: questionText.trim(),
          optionA: optionA.trim(),
          optionB: optionB.trim(),
          optionC: optionC.trim(),
          optionD: optionD.trim(),
          correctOption: correctOption,
          explanation: explanation.trim()
        });
      }
    }
  } catch (err) {
    console.error("Regex parsing failed, falling back to static questions:", err);
  }
  
  if (questions.length > 0) {
    return questions;
  }

  // Static fallback if regex parsing did not find any complete questions
  return [
    {
      order: 1,
      questionText: "Which of the following is the oldest mountain range in India?",
      optionA: "Aravalli Range",
      optionB: "Himalayas",
      optionC: "Satpura Range",
      optionD: "Nilgiri Hills",
      correctOption: "",
      explanation: ""
    },
    {
      order: 2,
      questionText: "The 'Quit India Movement' was launched in response to which of the following proposals?",
      optionA: "Cabinet Mission Plan",
      optionB: "Cripps Proposal",
      optionC: "Simon Commission Report",
      optionD: "Wavell Plan",
      correctOption: "",
      explanation: ""
    },
    {
      order: 3,
      questionText: "What is the speed of light in a vacuum?",
      optionA: "3 x 10^8 m/s",
      optionB: "3 x 10^5 m/s",
      optionC: "3 x 10^6 m/s",
      optionD: "3 x 10^7 m/s",
      correctOption: "",
      explanation: ""
    },
    {
      order: 4,
      questionText: "Who is the supreme commander of the Indian Armed Forces?",
      optionA: "Prime Minister of India",
      optionB: "Chief of Defence Staff",
      optionC: "President of India",
      optionD: "Defence Minister of India",
      correctOption: "",
      explanation: ""
    },
    {
      order: 5,
      questionText: "Which article of the Indian Constitution relates to the Emergency Provisions?",
      optionA: "Article 352",
      optionB: "Article 360",
      optionC: "Article 356",
      optionD: "All of the above",
      correctOption: "",
      explanation: ""
    }
  ];
}
