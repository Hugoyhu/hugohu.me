import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import qrcode from "qrcode-generator";
import { InventoryItem } from "@/types/inventory";

// 2x4 inch label
const PAGE_WIDTH = 288; // 4in
const PAGE_PADDING = 10;
const TITLE_MAX_SIZE = 16;
const TITLE_MIN_SIZE = 9;

const styles = StyleSheet.create({
  page: { padding: PAGE_PADDING, width: "4in", height: "2in" },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    paddingBottom: 5,
    marginBottom: 5,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  subtitle: { fontSize: 8, marginTop: 3 },
  body: { flexDirection: "row", marginTop: 3 },
  leftColumn: { flex: 1, marginRight: 8 },
  rightColumn: { width: 72, alignItems: "center" },
  row: {
    flexDirection: "row",
    fontSize: 8,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    borderBottomStyle: "solid",
  },
  label: { width: 64, fontWeight: "bold" },
  value: { flex: 1 },
  specsRow: { marginTop: 3 },
  specsText: { fontSize: 7, color: "#222" },
  qrLabel: { fontSize: 6, marginTop: 4, fontWeight: "bold" },
  qrContainer: { marginTop: 4 },
  qrRow: { flexDirection: "row" },
  qrCell: { width: 2.5, height: 2.5 },
});

// Helvetica-Bold advance widths (per 1000 units of font size) for ASCII
// 32-126, from the standard PDF font metrics. Used to size the title so it
// fits on one line.
const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584,
];

function boldTextWidth(text: string, fontSize: number) {
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    units += HELVETICA_BOLD_WIDTHS[code - 32] ?? 611; // non-ASCII: ~average
  }
  return (units / 1000) * fontSize;
}

// Largest size (down to TITLE_MIN_SIZE) that keeps the title on one line.
// Past the minimum it wraps instead, which still fits on the label.
function fitTitleSize(text: string) {
  const available = (PAGE_WIDTH - PAGE_PADDING * 2) * 0.97; // small margin
  const widthAtMax = boldTextWidth(text, TITLE_MAX_SIZE);
  if (widthAtMax <= available) return TITLE_MAX_SIZE;
  const fitted = Math.floor((TITLE_MAX_SIZE * available * 2) / widthAtMax) / 2;
  return Math.max(TITLE_MIN_SIZE, fitted);
}

function buildQrMatrix(value: string): boolean[][] {
  const qr = qrcode(0, "L");
  qr.addData(value || "-");
  qr.make();

  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];

  for (let row = 0; row < count; row++) {
    const rowData: boolean[] = [];
    for (let col = 0; col < count; col++) {
      rowData.push(qr.isDark(row, col));
    }
    matrix.push(rowData);
  }

  return matrix;
}

// One 2x4in label page. Wrapped in a Document by the exports below.
const LabelPage = ({ item }: { item: InventoryItem }) => {
  const qrMatrix = buildQrMatrix(item.mpn);

  const specsSummary = (item.spec || "").trim();

  return (
    <>
      {/* wrap={false}: never spill onto a second page */}
      <Page size={[PAGE_WIDTH, 144]} style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: fitTitleSize(item.name) }]}>
            {item.name}
          </Text>
          <Text style={styles.subtitle}>{item.mpn}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.leftColumn}>
            <View style={styles.row}>
              <Text style={styles.label}>MFR</Text>
              <Text style={styles.value}>{item.manufacturer}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{item.category}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Subcat</Text>
              <Text style={styles.value}>{item.subcategory}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Package</Text>
              <Text style={styles.value}>{item.package}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>RoHS / MSL</Text>
              <Text style={styles.value}>
                {item.rohs ? "RoHS" : "Non-RoHS"} / MSL {item.msl}
              </Text>
            </View>
            {specsSummary ? (
              <View style={styles.specsRow}>
                <Text style={styles.specsText}>{specsSummary}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.qrContainer}>
              {qrMatrix.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.qrRow}>
                  {row.map((isDark, colIndex) => (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={colIndex}
                      style={[
                        styles.qrCell,
                        { backgroundColor: isDark ? "#000" : "#fff" },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
            <Text style={styles.qrLabel}>MPN QR</Text>
          </View>
        </View>
      </Page>
    </>
  );
};

export const LabelDocument = ({ item }: { item: InventoryItem }) => (
  <Document>
    <LabelPage item={item} />
  </Document>
);

// Several labels in one PDF, one per page.
export const LabelsDocument = ({ items }: { items: InventoryItem[] }) => (
  <Document>
    {items.map((item) => (
      <LabelPage key={item.id} item={item} />
    ))}
  </Document>
);
