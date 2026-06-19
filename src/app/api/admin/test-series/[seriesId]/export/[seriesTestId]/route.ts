import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(
  req: Request,
  { params }: { params: { seriesId: string; seriesTestId: string } }
) {
  try {
    const { seriesTestId } = params;

    const test = await db.seriesTest.findUnique({
      where: { id: seriesTestId },
      include: {
        sections: {
          orderBy: { order: "asc" }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Series test not found" }, { status: 404 });
    }

    const questions = await db.seriesQuestion.findMany({
      where: {
        section: {
          seriesTestId
        }
      }
    });

    const attempts = await db.seriesAttempt.findMany({
      where: {
        seriesTestId,
        submittedAt: { not: null }
      },
      include: {
        student: {
          select: { name: true, fatherName: true, mobile: true }
        },
        answers: true,
        sectionResults: {
          include: {
            section: true
          }
        }
      }
    });

    const maxSec = test.duration * 60;

    const results = attempts.map((att) => {
      let correct = 0;
      let incorrect = 0;
      let unattempted = 0;

      att.sectionResults.forEach(sr => {
        correct += sr.correct;
        incorrect += sr.wrong;
        unattempted += sr.unattempted;
      });

      const started = new Date(att.startedAt).getTime();
      const submitted = new Date(att.submittedAt!).getTime();
      let timeSpent = Math.floor((submitted - started) / 1000);
      if (timeSpent > maxSec) timeSpent = maxSec;

      const formatTime = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      };

      const row: any = {
        Rank: att.rank || 0,
        "Student Name": att.student.name,
        "Father's Name": att.student.fatherName,
        "Mobile Number": att.student.mobile
      };

      // Add section-specific columns
      test.sections.forEach(sec => {
        const sr = att.sectionResults.find(r => r.sectionId === sec.id);
        row[`${sec.subject} Score`] = sr ? parseFloat(sr.score.toFixed(2)) : 0;
        row[`${sec.subject} Correct`] = sr ? sr.correct : 0;
        row[`${sec.subject} Wrong`] = sr ? sr.wrong : 0;
      });

      // Total metrics
      row["Total Score"] = parseFloat((att.score || 0).toFixed(2));
      row["Total Correct"] = correct;
      row["Total Wrong"] = incorrect;
      row.Unattempted = unattempted;
      row["Accuracy (%)"] = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
      row["Time Taken"] = formatTime(timeSpent);

      return row;
    });

    results.sort((a, b) => a.Rank - b.Rank);

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=results_${test.title.replace(/\s+/g, "_")}.xlsx`
      }
    });
  } catch (error: any) {
    console.error("Export Series Results Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
