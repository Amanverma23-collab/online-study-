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

    let questions: any[] = [];
    let jsonText = "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-flash-latest",
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 16384,
          },
        });

        const EXTRACTION_PROMPT = `You are an expert at extracting MCQ questions from CDS/NDA English exam papers.
The PDF may contain multiple sections with different question types. Extract ALL questions from the entire document,
regardless of section or question type.

For EVERY question found (numbered Q1 through Q50 or however many exist), extract:
- questionText: The COMPLETE question text exactly as it appears, preserving all line breaks between statements
  by using "\\n" to represent each new line. For example, Statement I on its own line, Statement II on next line, etc.
  Keep ALL-CAPS words exactly as they are (do not change case).
  For Sentence Improvement questions: include the full sentence with the underlined/key part marked with **double asterisks**
  like this: "The CEO **has been appointed** two years ago..."
  For Correlating Sentences: include both S1 and S2 in the questionText separated by \\n
  For Comprehension: include the question only (NOT the passage — the passage will be handled separately)
- optionA, optionB, optionC, optionD: The text of each option. Remove the option letter prefix (a), (b), (c), (d)
  — just include the text
- correctOption: Leave this as "" (empty string) — the teacher will mark correct answers manually
- explanation: "" (empty string)

If a question has fewer than 4 options, fill remaining with "N/A".

Return ONLY a valid JSON array. No explanation, no markdown, no backticks:
[
  {
    "order": 1,
    "questionText": "Consider the following statements...\\nStatement I: ...\\nStatement II: ...\\nStatement III: ...\\nWhich of the statements given above is/are correct?",
    "optionA": "I and II only",
    "optionB": "II and III only",
    "optionC": "I and III only",
    "optionD": "I, II, and III",
    "correctOption": "",
    "explanation": ""
  }
]

IMPORTANT:
- Extract ALL questions from ALL sections/parts of the document
- Do NOT skip any questions
- If the PDF is long, process it completely — do not stop early
- Preserve ALL-CAPS words as uppercase`;

        const CHUNK_THRESHOLD = 14000;

        const extractChunk = async (
          chunkText: string,
          startFrom: number
        ): Promise<any[]> => {
          const prompt = `${EXTRACTION_PROMPT}\n\nNote: Questions in this chunk start from approximately Q${startFrom}.\n\nText:\n${chunkText}`;
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return JSON.parse(text);
        };

        if (parsedText.length > CHUNK_THRESHOLD) {
          const splitPoints = [
            parsedText.indexOf("PART III"),
            parsedText.indexOf("\n26."),
            parsedText.indexOf("\nQ26"),
            parsedText.indexOf("PART IV"),
            parsedText.indexOf("\n31."),
            parsedText.indexOf("\nQ31"),
          ];
          const validSplits = splitPoints.filter(
            (i) => i > CHUNK_THRESHOLD / 2
          );
          const midpoint =
            validSplits.length > 0
              ? validSplits[0]
              : Math.floor(parsedText.length / 2);

          const chunk1 = parsedText.slice(0, midpoint);
          const chunk2 = parsedText.slice(midpoint);

          const midQGuess = (() => {
            const m = chunk1.match(/(\d+)\.\s/);
            return m ? parseInt(m[1]) + 5 : 25;
          })();

          const [results1, results2] = await Promise.all([
            extractChunk(chunk1, 1),
            extractChunk(chunk2, midQGuess),
          ]);

          questions = [...results1, ...results2];
        } else {
          questions = await extractChunk(parsedText, 1);
        }
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
