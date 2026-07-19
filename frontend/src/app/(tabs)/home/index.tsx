import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MOCK_MOMENTS = [
  {
    id: "1",
    content: "今天在悉尼歌剧院附近散步，海风很温柔。",
    createdAt: "2 小时前",
    mood: "😊",
  },
  { id: "2", content: "读完了一本好书，收获满满。", createdAt: "5 小时前", mood: "📖" },
  { id: "3", content: "和朋友吃了一顿很棒的晚餐！", createdAt: "昨天", mood: "🍽️" },
];

export default function HomeFeedScreen() {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ShengKe</Text>
        <Text style={styles.headerSubtitle}>你的生活记录</Text>
      </View>
      <FlatList
        data={MOCK_MOMENTS}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.mood}>{item.mood}</Text>
              <Text style={styles.time}>{item.createdAt}</Text>
            </View>
            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>还没有生刻记录</Text>
            <Text style={styles.emptySubtext}>点击下方 + 发布第一条</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mood: {
    fontSize: 24,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  content: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  empty: {
    paddingVertical: 80,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bbb",
  },
});
