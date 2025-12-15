import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Product = {
  id: number;
  name: string;
  description?: string | null;
};

const COUNTDOWN_DEFAULT = 10;

// ✅ Your backend base URL (must end with /api/)
const BACKEND_BASE_URL =
  "https://customer-preprod.craftapp.ai/customer/fe41e714-9899-4fd6-936a-9fe0ea691319/api/";

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

export default function App() {
  // ---------------------------
  // Countdown (your existing app)
  // ---------------------------
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_DEFAULT);
  const [running, setRunning] = useState(false);
  const firedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const perms = await Notifications.getPermissionsAsync();
      if (perms.status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }

      await Notifications.setNotificationChannelAsync("countdown", {
        name: "Countdown",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    })();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = () => {
    if (running) return;
    setRunning(true);

    intervalRef.current = setInterval(async () => {
      setSecondsLeft((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);

          if (!firedRef.current) {
            firedRef.current = true;
            Notifications.scheduleNotificationAsync({
              content: {
                title: "⏰ Countdown finished",
                body: "Time is up!",
                sound: "default",
              },
              trigger: null,
            });
          }

          return 0;
        }

        return next;
      });
    }, 1000);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    firedRef.current = false;
    setRunning(false);
    setSecondsLeft(COUNTDOWN_DEFAULT);
  };

  // ---------------------------
  // Backend UI (Products)
  // ---------------------------
  const api = useMemo(() => {
    return {
      listProducts: joinUrl(BACKEND_BASE_URL, "v1/products/"),
      createProduct: joinUrl(BACKEND_BASE_URL, "v1/products/"),
    };
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setError(null);
    setLoadingList(true);
    try {
      const res = await fetch(api.listProducts, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = JSON.parse(text) as Product[];
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load products");
    } finally {
      setLoadingList(false);
    }
  };

  const createProduct = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter a product name.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(api.createProduct, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      // If backend returns created product:
      // const created = JSON.parse(text) as Product;

      setName("");
      setDescription("");
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    // auto-load once on start
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Countdown section */}
        <View style={styles.card}>
          <Text style={styles.title}>Countdown</Text>
          <Text style={styles.timer}>{secondsLeft}s</Text>

          <View style={styles.row}>
            <Pressable style={[styles.btn, running && styles.btnDisabled]} onPress={start}>
              <Text style={styles.btnText}>{running ? "Running..." : "Start"}</Text>
            </Pressable>

            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={reset}>
              <Text style={styles.btnText}>Reset</Text>
            </Pressable>
          </View>
        </View>

        {/* Backend section */}
        <View style={styles.card}>
          <Text style={styles.title}>Products (Backend)</Text>
          <Text style={styles.muted} numberOfLines={2}>
            Base URL: {BACKEND_BASE_URL}
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Product name"
              style={styles.input}
              autoCapitalize="none"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              style={[styles.input, styles.textarea]}
              multiline
            />

            <View style={styles.row}>
              <Pressable
                style={[styles.btn, creating && styles.btnDisabled]}
                onPress={createProduct}
                disabled={creating}
              >
                <Text style={styles.btnText}>{creating ? "Creating..." : "Create"}</Text>
              </Pressable>

              <Pressable
                style={[styles.btn, styles.btnSecondary, loadingList && styles.btnDisabled]}
                onPress={fetchProducts}
                disabled={loadingList}
              >
                <Text style={styles.btnText}>{loadingList ? "Loading..." : "Refresh"}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.subtitle}>Saved products</Text>
            {loadingList ? <ActivityIndicator /> : null}
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.muted}>No products yet. Create one above.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  Alert.alert(item.name, item.description?.toString() || "(no description)")
                }
                style={styles.productRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {!!item.description && (
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Text style={styles.productId}>#{item.id}</Text>
              </Pressable>
            )}
          />
        </View>

        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f4f6" },
  container: { flex: 1, padding: 16, gap: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  title: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: "700" },
  muted: { color: "#6b7280" },

  timer: { fontSize: 44, fontWeight: "900", marginBottom: 12 },

  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#111827" },
  btnSecondary: { backgroundColor: "#374151" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "white", fontWeight: "800" },

  form: { marginTop: 12, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },

  errorBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#991b1b", fontWeight: "700" },

  listHeader: { marginTop: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
  list: { gap: 10, paddingBottom: 4 },

  productRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  productName: { fontSize: 16, fontWeight: "800" },
  productDesc: { color: "#4b5563", marginTop: 2 },
  productId: { color: "#6b7280", fontWeight: "800" },
});
