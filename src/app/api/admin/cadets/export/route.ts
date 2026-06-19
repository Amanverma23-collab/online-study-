import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const students = await db.student.findMany({
      include: {
        attempts: {
          select: {
            id: true,
            submittedAt: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    const results = students.map((s, index) => ({
      "S.No.": index + 1,
      "Cadet Name": s.name,
      "Father's Name": s.fatherName,
      "Mobile Number": s.mobile,
      "Batch": s.batch,
      Status: s.status,
      "Total Attempts Started": s.attempts.length,
      "Total Attempts Submitted": s.attempts.filter(a => a.submittedAt !== null).length
    }));

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cadets");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=cadets_list.xlsx"
      }
    });
  } catch (error: any) {
    console.error("Export Cadets Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
