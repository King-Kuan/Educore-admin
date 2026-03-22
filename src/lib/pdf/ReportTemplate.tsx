import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
  Font, Image, pdf,
} from "@react-pdf/renderer";

// ─── TYPES ────────────────────────────────────────────────────────────────

interface SubjectResult {
  subjectName: string;
  caMax:       number;
  caScore:     number;
  examMax:     number;
  examScore:   number;
  totalMax:    number;
  totalScore:  number;
  percentage:  number;
  grade:       string;
}

interface TermData {
  subjects:     SubjectResult[];
  conductScore: number;
  conductGrade: string;
  grandTotal:   number;
  grandMax:     number;
  percentage:   number;
  grade:        string;
  position:     number;
  totalStudents:number;
  attendance:   { present: number; absent: number; late: number };
}

interface StudentReportProps {
  student:      Record<string, unknown>;
  school:       Record<string, unknown>;
  class:        Record<string, unknown>;
  subjects:     Record<string, unknown>[];
  term:         number | "annual";
  academicYear: string;
  termData?:    TermData;   // for progressive
  term1?:       TermData;   // for annual
  term2?:       TermData;
  term3?:       TermData;
  annualTotal?:       number;
  annualMax?:         number;
  annualPercentage?:  number;
  annualGrade?:       string;
  annualPosition?:    number;
  firstDecision?: string;
  finalDecision?: string;
  totalStudents:  number;
}

// ─── STYLES ───────────────────────────────────────────────────────────────

const GREEN  = "#1a3a2a";
const GREEN2 = "#2d5c42";
const CREAM  = "#faf8f5";
const GRAY   = "#f4f1eb";
const RULE   = "#d4cfc8";
const INK    = "#111111";
const INK3   = "#666666";
const INK4   = "#999999";
const RED    = "#8b2020";
const RW_G   = "#20603D";
const RW_Y   = "#FAD201";
const RW_B   = "#00A1DE";

const s = StyleSheet.create({
  page:         { backgroundColor: "#fff", fontFamily: "Helvetica", fontSize: 9, color: INK, paddingBottom: 30 },
  flagStripe:   { flexDirection: "row", height: 3 },
  flagG:        { flex: 2, backgroundColor: RW_G },
  flagY:        { flex: 1, backgroundColor: RW_Y },
  flagB:        { flex: 1, backgroundColor: RW_B },
  hdr:          { backgroundColor: GREEN, flexDirection: "row", alignItems: "center", padding: "10 16", gap: 10 },
  logoCircle:   { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", border: "1.5 solid rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  logoTxt:      { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: "Helvetica-Bold" },
  hdrMid:       { flex: 1, alignItems: "center" },
  republic:     { color: "rgba(255,255,255,0.55)", fontSize: 7, letterSpacing: 1, marginBottom: 1 },
  schoolName:   { color: "#fff", fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginBottom: 2 },
  reportType:   { backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 7.5, paddingHorizontal: 10, paddingVertical: 2.5, borderRadius: 10, letterSpacing: 0.8 },
  metaBand:     { backgroundColor: GRAY, flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: GREEN, paddingHorizontal: 16, paddingVertical: 6 },
  metaItem:     { flex: 1 },
  metaLabel:    { fontSize: 6.5, color: INK4, letterSpacing: 0.8, marginBottom: 1.5 },
  metaValue:    { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK },
  stuRow:       { flexDirection: "row", padding: "10 16", borderBottomWidth: 1, borderBottomColor: "#ece8e2", gap: 14, alignItems: "center" },
  stuPhoto:     { width: 44, height: 54, backgroundColor: GRAY, borderWidth: 0.5, borderColor: RULE, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  stuPhotoTxt:  { fontSize: 6, color: INK4 },
  stuField:     { flex: 1 },
  sfLabel:      { fontSize: 6.5, color: INK4, letterSpacing: 0.8, marginBottom: 1.5 },
  sfValue:      { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  secHd:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: GREEN, paddingHorizontal: 16, paddingVertical: 5 },
  secHdTxt:     { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 1, color: GREEN },
  secHdSub:     { fontSize: 6, color: INK4, letterSpacing: 0.5 },
  tblWrap:      { paddingHorizontal: 16, paddingBottom: 8 },
  tblHdrRow:    { flexDirection: "row", backgroundColor: GREEN },
  tblHdrCell:   { color: "rgba(255,255,255,0.85)", fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, padding: "4 5", textAlign: "center" },
  tblHdrLeft:   { textAlign: "left" },
  tblRow:       { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ece8e2" },
  tblRowAlt:    { backgroundColor: GRAY },
  tblRowConduct:{ backgroundColor: "#faf7f0" },
  tblRowTotal:  { backgroundColor: GRAY, borderTopWidth: 1.5, borderTopColor: RULE },
  tblCell:      { fontSize: 8, padding: "4 5", textAlign: "center" },
  tblCellLeft:  { textAlign: "left" },
  tblCellMono:  { fontFamily: "Courier", fontSize: 7.5 },
  tblCellBold:  { fontFamily: "Helvetica-Bold" },
  subjName:     { fontFamily: "Helvetica-Bold", fontSize: 8 },
  summBar:      { margin: "0 16 8", backgroundColor: GREEN, borderRadius: 4, flexDirection: "row", padding: "8 14" },
  sbItem:       { flex: 1, alignItems: "center" },
  sbLabel:      { fontSize: 6, color: "rgba(255,255,255,0.45)", letterSpacing: 0.6, marginBottom: 2 },
  sbValue:      { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#fff" },
  sbGold:       { color: "#fbbf24" },
  sbLime:       { color: "#86efac" },
  sbCoral:      { color: "#fca5a5" },
  sbDiv:        { width: 0.5, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 4 },
  scaleBox:     { margin: "0 16 8", borderWidth: 0.5, borderColor: RULE, borderRadius: 3 },
  scaleHd:      { backgroundColor: GRAY, padding: "4 10", borderBottomWidth: 0.5, borderBottomColor: RULE, fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, color: INK3 },
  scaleRow:     { flexDirection: "row", padding: "4 10" },
  scaleCell:    { flex: 1, alignItems: "center" },
  scalePct:     { fontSize: 6.5, color: INK4, fontFamily: "Courier" },
  scaleGrade:   { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  scaleDesc:    { fontSize: 6, color: INK3 },
  decisionWrap: { margin: "0 16 8", flexDirection: "row", gap: 8 },
  decBox:       { flex: 1, borderWidth: 0.5, borderColor: RULE, borderRadius: 3 },
  decHd:        { backgroundColor: GRAY, padding: "4 10", borderBottomWidth: 0.5, borderBottomColor: RULE, fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, color: INK3 },
  decBody:      { padding: "6 10" },
  decOption:    { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  decSquare:    { width: 8, height: 8, borderWidth: 1, borderColor: INK3, borderRadius: 1 },
  decSquareChk: { backgroundColor: GREEN, borderColor: GREEN },
  decTxt:       { fontSize: 8 },
  sigWrap:      { margin: "0 16 10", flexDirection: "row", gap: 10 },
  sigBox:       { flex: 1, borderWidth: 0.5, borderColor: RULE, borderRadius: 3 },
  sigHd:        { backgroundColor: GRAY, padding: "4 10", borderBottomWidth: 0.5, borderBottomColor: RULE, fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, color: INK3 },
  sigBody:      { padding: "8 10 6" },
  sigLine:      { borderBottomWidth: 0.5, borderBottomColor: INK, height: 22, marginBottom: 3 },
  sigName:      { fontSize: 7, color: INK4, fontFamily: "Courier" },
  docFoot:      { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: GREEN, flexDirection: "row", justifyContent: "space-between", padding: "5 16" },
  footTxt:      { fontSize: 6, color: "rgba(255,255,255,0.4)", fontFamily: "Courier" },
  attWrap:      { margin: "0 16 8" },
  attGrid:      { flexDirection: "row", borderWidth: 0.5, borderColor: RULE, borderRadius: 3, overflow: "hidden" },
  attCell:      { flex: 1, padding: "8 10", borderRightWidth: 0.5, borderRightColor: RULE },
  attNum:       { fontSize: 16, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  attLabel:     { fontSize: 6, color: INK4, letterSpacing: 0.5, marginTop: 2 },
  annualTbl:    { margin: "0 16 8" },
  promoBox:     { margin: "0 16 8", borderWidth: 1.5, borderColor: GREEN, borderRadius: 4, flexDirection: "row", overflow: "hidden" },
  promoLeft:    { backgroundColor: GREEN, padding: "10 14", alignItems: "center", justifyContent: "center", minWidth: 100 },
  promoDecision:{ fontSize: 16, fontFamily: "Helvetica-Bold", color: "#86efac" },
  promoRepeat:  { color: "#fca5a5" },
  promoRight:   { flex: 1, padding: "10 14" },
  promoDetail:  { marginBottom: 4 },
  pdLabel:      { fontSize: 6.5, color: INK4, letterSpacing: 0.6 },
  pdValue:      { fontSize: 9, fontFamily: "Helvetica-Bold" },
});

// ─── GRADE COLOR HELPER ───────────────────────────────────────────────────

function gradeColor(grade: string): string {
  const m: Record<string, string> = {
    A: "#1a6b35", B: "#1a4a7a", C: "#2a6010",
    D: "#505810", E: "#7a5a10", S: "#7a3a10", F: RED,
  };
  return m[grade] ?? INK;
}

// ─── GRADE SCALE TABLE ────────────────────────────────────────────────────

function GradeScaleTable() {
  const scale = [
    { pct: "80–100%", grade: "A", desc: "Excellent",   color: "#1a6b35" },
    { pct: "75–79%",  grade: "B", desc: "Very Good",   color: "#1a4a7a" },
    { pct: "70–74%",  grade: "C", desc: "Good",        color: "#2a6010" },
    { pct: "65–69%",  grade: "D", desc: "Satisfactory",color: "#505810" },
    { pct: "60–64%",  grade: "E", desc: "Adequate",    color: "#7a5a10" },
    { pct: "50–59%",  grade: "S", desc: "Min. Pass",   color: "#7a3a10" },
    { pct: "0–49%",   grade: "F", desc: "Fail",        color: RED       },
  ];

  return (
    <View style={s.scaleBox}>
      <Text style={s.scaleHd}>Grading Scale</Text>
      <View style={s.scaleRow}>
        {scale.map((sc) => (
          <View key={sc.grade} style={s.scaleCell}>
            <Text style={s.scalePct}>{sc.pct}</Text>
            <Text style={[s.scaleGrade, { color: sc.color }]}>{sc.grade}</Text>
            <Text style={s.scaleDesc}>{sc.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── MARKS TABLE ─────────────────────────────────────────────────────────

function MarksTable({ subjects, termData, isNursery }: {
  subjects:   Record<string, unknown>[];
  termData:   TermData;
  isNursery?: boolean;
}) {
  if (isNursery) {
    return (
      <View style={s.tblWrap}>
        <View style={s.tblHdrRow}>
          {["Learning Area", "Term 1", "Term 2", "Teacher's Observation"].map((h, i) => (
            <Text key={h} style={[s.tblHdrCell, i === 0 ? s.tblHdrLeft : {}, i === 0 ? { flex: 2.5 } : { flex: 1 }]}>{h}</Text>
          ))}
        </View>
        {termData.subjects.map((subj, i) => (
          <View key={i} style={[s.tblRow, i % 2 !== 0 ? s.tblRowAlt : {}]}>
            <Text style={[s.tblCell, s.tblCellLeft, s.subjName, { flex: 2.5 }]}>{subj.subjectName}</Text>
            <Text style={[s.tblCell, { flex: 1, color: gradeColor(subj.grade) }]}>{subj.grade}</Text>
            <Text style={[s.tblCell, { flex: 1, color: gradeColor(subj.grade) }]}>{subj.grade}</Text>
            <Text style={[s.tblCell, s.tblCellLeft, { flex: 1, fontSize: 7, color: INK3 }]}>—</Text>
          </View>
        ))}
      </View>
    );
  }

  const cols = ["Subject", "CA Max", "CA", "Ex Max", "Exam", "Total", "Max", "%", "Gr"];
  const widths = [2.5, 0.7, 0.7, 0.7, 0.7, 0.8, 0.8, 0.8, 0.6];

  return (
    <View style={s.tblWrap}>
      <View style={s.tblHdrRow}>
        {cols.map((c, i) => (
          <Text key={c} style={[s.tblHdrCell, i === 0 ? s.tblHdrLeft : {}, { flex: widths[i] }]}>{c}</Text>
        ))}
      </View>

      {/* Conduct */}
      <View style={s.tblRowConduct}>
        <Text style={[s.tblCell, s.tblCellLeft, { flex: 2.5, fontStyle: "italic" }]}>Conduct</Text>
        <Text style={[s.tblCell, { flex: 0.7, color: INK4 }]}>—</Text>
        <Text style={[s.tblCell, { flex: 0.7, color: INK4 }]}>—</Text>
        <Text style={[s.tblCell, { flex: 0.7, color: INK4 }]}>—</Text>
        <Text style={[s.tblCell, { flex: 0.7, color: INK4 }]}>—</Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.8 }]}>{termData.conductScore}</Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.8, color: INK4 }]}>40</Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.8 }]}>{((termData.conductScore / 40) * 100).toFixed(0)}%</Text>
        <Text style={[s.tblCell, { flex: 0.6, color: gradeColor(termData.conductGrade) }]}>{termData.conductGrade}</Text>
      </View>

      {/* Subjects */}
      {termData.subjects.map((subj, i) => (
        <View key={i} style={[s.tblRow, i % 2 === 0 ? s.tblRowAlt : {}]}>
          <Text style={[s.tblCell, s.tblCellLeft, s.subjName, { flex: 2.5 }]}>{subj.subjectName}</Text>
          <Text style={[s.tblCell, s.tblCellMono, { flex: 0.7, color: INK4 }]}>{subj.caMax}</Text>
          <Text style={[s.tblCell, s.tblCellMono, { flex: 0.7 }]}>{subj.caScore}</Text>
          <Text style={[s.tblCell, s.tblCellMono, { flex: 0.7, color: INK4 }]}>{subj.examMax}</Text>
          <Text style={[s.tblCell, s.tblCellMono, { flex: 0.7 }]}>{subj.examScore}</Text>
          <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.8 }]}>{subj.totalScore}</Text>
          <Text style={[s.tblCell, s.tblCellMono, { flex: 0.8, color: INK4 }]}>{subj.totalMax}</Text>
          <Text style={[s.tblCell, s.tblCellMono, { flex: 0.8 }]}>{subj.percentage.toFixed(1)}%</Text>
          <Text style={[s.tblCell, { flex: 0.6, fontFamily: "Helvetica-Bold", color: gradeColor(subj.grade) }]}>{subj.grade}</Text>
        </View>
      ))}

      {/* Totals */}
      <View style={s.tblRowTotal}>
        <Text style={[s.tblCell, s.tblCellLeft, s.tblCellBold, { flex: 2.5 }]}>Total</Text>
        <Text style={[s.tblCell, { flex: 0.7 }]}></Text>
        <Text style={[s.tblCell, { flex: 0.7 }]}></Text>
        <Text style={[s.tblCell, { flex: 0.7 }]}></Text>
        <Text style={[s.tblCell, { flex: 0.7 }]}></Text>
        <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.8 }]}>{termData.grandTotal}</Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.8, color: INK4 }]}>{termData.grandMax}</Text>
        <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.8, color: termData.percentage < 50 ? RED : GREEN2 }]}>
          {termData.percentage.toFixed(1)}%
        </Text>
        <Text style={[s.tblCell, { flex: 0.6, fontFamily: "Helvetica-Bold", color: gradeColor(termData.grade) }]}>{termData.grade}</Text>
      </View>
    </View>
  );
}

// ─── ANNUAL MARKS TABLE ───────────────────────────────────────────────────

function AnnualMarksTable({ subjects, t1, t2, t3, annualTotal, annualMax, annualPct, annualGrade }: {
  subjects:     Record<string, unknown>[];
  t1:           TermData | undefined;
  t2:           TermData | undefined;
  t3:           TermData | undefined;
  annualTotal:  number;
  annualMax:    number;
  annualPct:    number;
  annualGrade:  string;
}) {
  return (
    <View style={s.annualTbl}>
      <View style={s.tblHdrRow}>
        {["Subject", "Max", "T1 TS", "T1 Ex", "T1 Tot", "GR", "T2 TS", "T2 Ex", "T2 Tot", "GR", "T3 TS", "T3 Ex", "T3 Tot", "GR", "Annual", "Max", "%", "GR"].map((h, i) => (
          <Text key={i} style={[s.tblHdrCell, i === 0 ? { flex: 2 } : { flex: 0.6 }, i === 0 ? s.tblHdrLeft : {}]}>{h}</Text>
        ))}
      </View>

      {/* Conduct row */}
      <View style={s.tblRowConduct}>
        <Text style={[s.tblCell, s.tblCellLeft, { flex: 2, fontStyle: "italic" }]}>Conduct</Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: INK4 }]}>40</Text>
        {[t1, t2, t3].map((t, ti) => (
          <React.Fragment key={ti}>
            <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: INK4 }]}>—</Text>
            <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: INK4 }]}>—</Text>
            <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6 }]}>{t?.conductScore ?? "—"}</Text>
            <Text style={[s.tblCell, { flex: 0.6, color: gradeColor(t?.conductGrade ?? "F") }]}>{t?.conductGrade ?? "—"}</Text>
          </React.Fragment>
        ))}
        <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.6 }]}>
          {(t1?.conductScore ?? 0) + (t2?.conductScore ?? 0) + (t3?.conductScore ?? 0)}
        </Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: INK4 }]}>120</Text>
        <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6 }]}>
          {Math.round(((t1?.conductScore ?? 0) + (t2?.conductScore ?? 0) + (t3?.conductScore ?? 0)) / 1.2)}%
        </Text>
        <Text style={[s.tblCell, { flex: 0.6, fontFamily: "Helvetica-Bold", color: GREEN2 }]}>A</Text>
      </View>

      {subjects.map((subj, i) => {
        const s1 = t1?.subjects[i];
        const s2 = t2?.subjects[i];
        const s3 = t3?.subjects[i];
        const aTotal = (s1?.totalScore ?? 0) + (s2?.totalScore ?? 0) + (s3?.totalScore ?? 0);
        const aMax   = (subj["totalMax"] as number ?? 0) * 3;
        const aPct   = aMax > 0 ? parseFloat(((aTotal / aMax) * 100).toFixed(1)) : 0;

        return (
          <View key={i} style={[s.tblRow, i % 2 !== 0 ? s.tblRowAlt : {}]}>
            <Text style={[s.tblCell, s.tblCellLeft, s.subjName, { flex: 2 }]}>{subj["name"] as string}</Text>
            <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: INK4 }]}>{subj["totalMax"] as number}</Text>
            {[s1, s2, s3].map((ts, ti) => (
              <React.Fragment key={ti}>
                <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6 }]}>{ts?.caScore ?? "—"}</Text>
                <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6 }]}>{ts?.examScore ?? "—"}</Text>
                <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6 }]}>{ts?.totalScore ?? "—"}</Text>
                <Text style={[s.tblCell, { flex: 0.6, color: gradeColor(ts?.grade ?? "F") }]}>{ts?.grade ?? "—"}</Text>
              </React.Fragment>
            ))}
            <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.6 }]}>{aTotal}</Text>
            <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: INK4 }]}>{aMax}</Text>
            <Text style={[s.tblCell, s.tblCellMono, { flex: 0.6, color: aPct < 50 ? RED : INK }]}>{aPct}%</Text>
            <Text style={[s.tblCell, { flex: 0.6, fontFamily: "Helvetica-Bold", color: gradeColor(aPct >= 80 ? "A" : aPct >= 65 ? "B" : aPct >= 50 ? "C" : "F") }]}>
              {aPct >= 80 ? "A" : aPct >= 75 ? "B" : aPct >= 70 ? "C" : aPct >= 65 ? "D" : aPct >= 60 ? "E" : aPct >= 50 ? "S" : "F"}
            </Text>
          </View>
        );
      })}

      {/* Totals + percentage + position */}
      {[
        { label: "Total",      values: [t1?.grandTotal, t2?.grandTotal, t3?.grandTotal, annualTotal, annualMax] },
        { label: "Percentage", values: [t1?.percentage?.toFixed(1)+"%", t2?.percentage?.toFixed(1)+"%", t3?.percentage?.toFixed(1)+"%", annualPct.toFixed(1)+"%", ""] },
      ].map((row) => (
        <View key={row.label} style={{ flexDirection: "row", backgroundColor: GRAY, borderTopWidth: row.label === "Total" ? 1.5 : 0, borderTopColor: RULE }}>
          <Text style={[s.tblCell, s.tblCellLeft, s.tblCellBold, { flex: 2 }]}>{row.label}</Text>
          <Text style={[s.tblCell, { flex: 0.6 }]}></Text>
          {/* Spread term values */}
          {[0, 1, 2].map((ti) => (
            <React.Fragment key={ti}>
              <Text style={[s.tblCell, { flex: 0.6 }]}></Text>
              <Text style={[s.tblCell, { flex: 0.6 }]}></Text>
              <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.6 }]}>{row.values[ti] ?? ""}</Text>
              <Text style={[s.tblCell, { flex: 0.6 }]}></Text>
            </React.Fragment>
          ))}
          <Text style={[s.tblCell, s.tblCellMono, s.tblCellBold, { flex: 0.6, color: annualPct < 50 ? RED : GREEN2 }]}>{row.values[3] ?? ""}</Text>
          <Text style={[s.tblCell, { flex: 0.6 }]}>{row.values[4] ?? ""}</Text>
          <Text style={[s.tblCell, { flex: 0.6 }]}></Text>
          <Text style={[s.tblCell, { flex: 0.6 }]}></Text>
        </View>
      ))}
    </View>
  );
}

// ─── MAIN DOCUMENT ────────────────────────────────────────────────────────

export function StudentReport({
  student, school, class: cls, subjects,
  term, academicYear, termData,
  t1 = termData, t2, t3,
  annualTotal = 0, annualMax = 0, annualPercentage = 0,
  annualGrade = "F", annualPosition = 0,
  firstDecision = "repeat", finalDecision = "repeat",
  totalStudents,
}: StudentReportProps) {
  const isAnnual  = term === "annual";
  const isNursery = false; // determined by levelId grading type
  const termLabel = isAnnual ? "Annual Report" : `Term ${term} Report`;

  const currentTermData = t1 ?? termData;
  if (!currentTermData) return null;

  return (
    <Document>
      <Page size="A4" style={s.page} orientation="portrait">
        {/* Rwanda flag stripe */}
        <View style={s.flagStripe}>
          <View style={s.flagG} /><View style={s.flagY} /><View style={s.flagB} />
        </View>

        {/* Header */}
        <View style={s.hdr}>
          <View style={s.logoCircle}>
            {school["logoUrl"]
              ? <Image src={school["logoUrl"] as string} style={{ width: 40, height: 40, borderRadius: 20 }} />
              : <Text style={s.logoTxt}>{(school["abbreviation"] as string ?? "SC").slice(0, 3)}</Text>
            }
          </View>
          <View style={s.hdrMid}>
            <Text style={s.republic}>REPUBLIC OF RWANDA · MINISTRY OF EDUCATION</Text>
            <Text style={s.schoolName}>{(school["name"] as string ?? "").toUpperCase()}</Text>
            <Text style={[s.republic, { marginBottom: 4 }]}>Tel: {school["phone"] as string ?? ""}</Text>
            <Text style={s.reportType}>
              {isAnnual ? "STUDENT ANNUAL REPORT" : "PROGRESSIVE REPORT"} — {academicYear}
            </Text>
          </View>
          {/* second logo / crest placeholder */}
          <View style={[s.logoCircle, { opacity: 0.6 }]}>
            <Text style={s.logoTxt}>{(school["abbreviation"] as string ?? "SC").slice(0, 3)}</Text>
          </View>
        </View>

        {/* Meta band */}
        <View style={s.metaBand}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>STUDENT NAME</Text>
            <Text style={s.metaValue}>{student["fullName"] as string}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>REG. NUMBER</Text>
            <Text style={[s.metaValue, { fontFamily: "Courier", fontSize: 8 }]}>{student["registrationNumber"] as string}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>CLASS</Text>
            <Text style={s.metaValue}>{cls["name"] as string}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>ACADEMIC YEAR</Text>
            <Text style={s.metaValue}>{academicYear}</Text>
          </View>
        </View>

        {/* Marks section heading */}
        <View style={s.secHd}>
          <Text style={s.secHdTxt}>
            {isAnnual ? "ANNUAL SUBJECT MARKS" : `TERM ${term} SUBJECT MARKS`}
          </Text>
          <Text style={s.secHdSub}>
            {isAnnual ? "All 3 terms combined · CA + Exam" : "M.T (Continuous) + Examination"}
          </Text>
        </View>

        {/* Marks table */}
        {isAnnual ? (
          <AnnualMarksTable
            subjects={subjects}
            t1={t1 ?? termData}
            t2={t2}
            t3={t3}
            annualTotal={annualTotal}
            annualMax={annualMax}
            annualPct={annualPercentage}
            annualGrade={annualGrade}
          />
        ) : (
          <MarksTable subjects={subjects} termData={currentTermData} isNursery={isNursery} />
        )}

        {/* Summary banner */}
        <View style={s.summBar}>
          {isAnnual ? (
            <>
              <View style={s.sbItem}><Text style={s.sbLabel}>T1 TOTAL</Text><Text style={s.sbValue}>{t1?.grandTotal ?? 0}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>T2 TOTAL</Text><Text style={s.sbValue}>{t2?.grandTotal ?? 0}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>T3 TOTAL</Text><Text style={s.sbValue}>{t3?.grandTotal ?? 0}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>ANNUAL TOTAL</Text><Text style={[s.sbValue, s.sbCoral]}>{annualTotal}/{annualMax}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>ANNUAL %</Text><Text style={[s.sbValue, annualPercentage >= 50 ? s.sbLime : s.sbCoral]}>{annualPercentage.toFixed(1)}%</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>POSITION</Text><Text style={[s.sbValue, s.sbGold]}>{annualPosition}/{totalStudents}</Text></View>
            </>
          ) : (
            <>
              <View style={s.sbItem}><Text style={s.sbLabel}>MT TOTAL</Text><Text style={s.sbValue}>{currentTermData.subjects.reduce((sum, sub) => sum + sub.caScore, 0)}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>EXAM TOTAL</Text><Text style={s.sbValue}>{currentTermData.subjects.reduce((sum, sub) => sum + sub.examScore, 0)}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>GRAND TOTAL</Text><Text style={s.sbValue}>{currentTermData.grandTotal}/{currentTermData.grandMax}</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>PERCENTAGE</Text><Text style={[s.sbValue, currentTermData.percentage >= 50 ? s.sbLime : s.sbCoral]}>{currentTermData.percentage.toFixed(1)}%</Text></View>
              <View style={s.sbDiv} />
              <View style={s.sbItem}><Text style={s.sbLabel}>POSITION</Text><Text style={[s.sbValue, s.sbGold]}>{currentTermData.position}/{totalStudents}</Text></View>
            </>
          )}
        </View>

        {/* Grade scale */}
        <GradeScaleTable />

        {/* Annual decision boxes */}
        {isAnnual && (
          <View style={s.decisionWrap}>
            {[
              { title: "FIRST DECISION", selected: firstDecision, options: ["promoted", "second_sitting", "discontinued"] },
              { title: "FINAL DECISION", selected: finalDecision, options: ["promoted", "repeat", "discontinued"] },
            ].map((dec) => (
              <View key={dec.title} style={s.decBox}>
                <Text style={s.decHd}>{dec.title}</Text>
                <View style={s.decBody}>
                  {dec.options.map((opt) => (
                    <View key={opt} style={s.decOption}>
                      <View style={[s.decSquare, dec.selected === opt ? s.decSquareChk : {}]} />
                      <Text style={s.decTxt}>
                        {opt === "promoted" ? "Promoted" : opt === "second_sitting" ? "2nd Sitting" : opt === "repeat" ? "Advised to Repeat" : "Discontinued"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Attendance */}
        <View style={s.secHd}><Text style={s.secHdTxt}>ATTENDANCE</Text></View>
        <View style={s.attWrap}>
          <View style={s.attGrid}>
            {[
              { label: "Present",  val: currentTermData.attendance.present, color: "#1a6b35" },
              { label: "Absent",   val: currentTermData.attendance.absent,  color: RED },
              { label: "Late",     val: currentTermData.attendance.late,    color: "#7a5a10" },
              { label: "Rate",     val: `${Math.round((currentTermData.attendance.present / Math.max(currentTermData.attendance.present + currentTermData.attendance.absent + currentTermData.attendance.late, 1)) * 100)}%`, color: GREEN2 },
            ].map((cell) => (
              <View key={cell.label} style={s.attCell}>
                <Text style={[s.attNum, { color: cell.color }]}>{cell.val}</Text>
                <Text style={s.attLabel}>{cell.label.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signatures */}
        <View style={s.sigWrap}>
          <View style={s.sigBox}>
            <Text style={s.sigHd}>CLASS TEACHER'S REMARKS AND SIGNATURE</Text>
            <View style={s.sigBody}>
              <View style={s.sigLine} />
              <Text style={s.sigName}>{cls["classTeacherName"] as string ?? "Class Teacher"}</Text>
            </View>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigHd}>PARENT'S SIGNATURE</Text>
            <View style={s.sigBody}>
              <View style={s.sigLine} />
              <Text style={s.sigName}>Received & acknowledged</Text>
            </View>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigHd}>HEADMASTER — STAMP & SIGNATURE</Text>
            <View style={s.sigBody}>
              <View style={[s.sigLine, { height: 28 }]} />
              <Text style={s.sigName}>Date: _______________</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.docFoot}>
          <Text style={s.footTxt}>EduCore RW · Generated: {new Date().toLocaleDateString("en-RW")}</Text>
          <Text style={s.footTxt}>educorerw.rw · Ministry of Education aligned</Text>
          <Text style={s.footTxt}>{student["registrationNumber"] as string} · {cls["name"] as string} · {termLabel}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── PDF BUFFER GENERATOR ─────────────────────────────────────────────────

export async function generateReportPDF(props: StudentReportProps): Promise<Buffer> {
  const element = React.createElement(StudentReport, props);
  const instance = pdf(element);
  const blob     = await instance.toBlob();
  const arrayBuf = await blob.arrayBuffer();
  return Buffer.from(arrayBuf);
}
