import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import qrcode from "qrcode-generator";
import { InventoryItem } from "@/types/inventory";

// 2x4 inch label
const styles = StyleSheet.create({
  page: { padding: 10, width: "4in", height: "2in" },
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

export const LabelDocument = ({ item }: { item: InventoryItem }) => {
  const qrMatrix = buildQrMatrix(item.mpn);

  const specsSummary = (item.spec || "").trim();

  return (
    <Document>
      <Page size={[288, 144]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{item.name}</Text>
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
    </Document>
  );
};
