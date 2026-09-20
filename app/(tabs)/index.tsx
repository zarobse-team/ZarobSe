import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../../constants/api";
import { JOB_CATEGORIES } from "../../constants/categories";

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  status: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    city: string;
  };
  createdAt: string;
  updatedAt: string;
};

type SortOption = "newest" | "oldest" | "priceAsc" | "priceDesc";

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Najnowsze", value: "newest" },
  { label: "Najstarsze", value: "oldest" },
  { label: "Cena: rosnąco", value: "priceAsc" },
  { label: "Cena: malejąco", value: "priceDesc" },
];

export default function BrowseScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Główna wyszukiwarka
  const [searchQuery, setSearchQuery] = useState("");

  // Kategorie
  const [selectedCategory, setSelectedCategory] = useState("Wszystko");

  // Panel dodatkowych filtrów
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Dodatkowe filtry
  const [cityFilter, setCityFilter] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  // Domyślne sortowanie
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const categories = ["Wszystko", ...JOB_CATEGORIES];

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Błąd", "Brak tokenu użytkownika.");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = [];
      }

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się pobrać zleceń.");
        return;
      }

      setJobs(data);
    } catch (error) {
      console.error("Jobs fetch error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, []),
  );

  // Wyszukiwanie + filtrowanie + sortowanie
  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedCity = cityFilter.trim().toLowerCase();

    const min =
      minBudget.trim() === "" ? null : Number(minBudget.replace(",", "."));

    const max =
      maxBudget.trim() === "" ? null : Number(maxBudget.replace(",", "."));

    const filtered = jobs.filter((job) => {
      const title = job.title?.toLowerCase() ?? "";
      const description = job.description?.toLowerCase() ?? "";
      const city = job.city?.toLowerCase() ?? "";

      // Wyszukiwanie po tytule, opisie lub mieście
      const matchesSearch =
        normalizedQuery.length === 0 ||
        title.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        city.includes(normalizedQuery);

      // Filtrowanie po kategorii
      const matchesCategory =
        selectedCategory === "Wszystko" || job.category === selectedCategory;

      // Filtrowanie po mieście
      const matchesCity =
        normalizedCity.length === 0 || city.includes(normalizedCity);

      // Minimalny budżet
      const matchesMinBudget =
        min === null || Number.isNaN(min) || job.budget >= min;

      // Maksymalny budżet
      const matchesMaxBudget =
        max === null || Number.isNaN(max) || job.budget <= max;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCity &&
        matchesMinBudget &&
        matchesMaxBudget
      );
    });

    // Sortowanie wyników
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        case "priceAsc":
          return a.budget - b.budget;

        case "priceDesc":
          return b.budget - a.budget;

        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  }, [
    jobs,
    searchQuery,
    selectedCategory,
    cityFilter,
    minBudget,
    maxBudget,
    sortBy,
  ]);

  // Liczba aktywnych dodatkowych filtrów
  const advancedFiltersCount =
    (cityFilter.trim() !== "" ? 1 : 0) +
    (minBudget.trim() !== "" ? 1 : 0) +
    (maxBudget.trim() !== "" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  // Czy użytkownik ustawił jakikolwiek filtr
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "Wszystko" ||
    advancedFiltersCount > 0;

  // Reset wszystkich filtrów
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Wszystko");
    setCityFilter("");
    setMinBudget("");
    setMaxBudget("");
    setSortBy("newest");

    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {/* NAGŁÓWEK */}

        <View style={styles.header}>
          <Text style={styles.logo}>Zarób Se</Text>

          <Text style={styles.subtitle}>
            Znajdź lokalne zlecenie w swojej okolicy
          </Text>
        </View>

        {/* WYSZUKIWARKA + PRZYCISK FILTRÓW */}

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#6B7280" />

            <TextInput
              placeholder="Szukaj zleceń..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={10}>
                <Ionicons name="close-circle" size={21} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              (filtersVisible || advancedFiltersCount > 0) &&
                styles.filterButtonActive,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setFiltersVisible((current) => !current);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={
                filtersVisible || advancedFiltersCount > 0
                  ? "#FFFFFF"
                  : "#2563EB"
              }
            />

            {advancedFiltersCount > 0 && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>
                  {advancedFiltersCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* KATEGORIE */}

        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
            keyboardShouldPersistTaps="handled"
          >
            {categories.map((category) => {
              const isActive = selectedCategory === category;

              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryPill,
                    isActive && styles.activeCategoryPill,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelectedCategory(category);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && styles.activeCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* PANEL FILTRÓW */}

        {filtersVisible && (
          <View style={styles.filtersPanel}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filtry</Text>

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setFiltersVisible(false);
                }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* MIASTO */}

            <Text style={styles.filterLabel}>Miasto</Text>

            <View style={styles.filterInputWrapper}>
              <Ionicons name="location-outline" size={18} color="#94A3B8" />

              <TextInput
                value={cityFilter}
                onChangeText={setCityFilter}
                placeholder="np. Kraków"
                placeholderTextColor="#9CA3AF"
                style={styles.filterInput}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              {cityFilter.length > 0 && (
                <TouchableOpacity onPress={() => setCityFilter("")}>
                  <Ionicons name="close-circle" size={19} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* BUDŻET */}

            <Text style={styles.filterLabel}>Budżet</Text>

            <View style={styles.budgetRow}>
              <View style={styles.budgetInputWrapper}>
                <Text style={styles.currencyText}>od</Text>

                <TextInput
                  value={minBudget}
                  onChangeText={setMinBudget}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={styles.budgetInput}
                />

                <Text style={styles.currencyText}>zł</Text>
              </View>

              <View style={styles.budgetInputWrapper}>
                <Text style={styles.currencyText}>do</Text>

                <TextInput
                  value={maxBudget}
                  onChangeText={setMaxBudget}
                  placeholder="1000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={styles.budgetInput}
                />

                <Text style={styles.currencyText}>zł</Text>
              </View>
            </View>

            {/* SORTOWANIE */}

            <Text style={styles.filterLabel}>Sortowanie</Text>

            <View style={styles.sortOptions}>
              {sortOptions.map((option) => {
                const isActive = sortBy === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      isActive && styles.activeSortOption,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSortBy(option.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        isActive && styles.activeSortOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>

                    {isActive && (
                      <Ionicons name="checkmark" size={17} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PRZYCISKI FILTRÓW */}

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.resetFiltersText}>Wyczyść</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.showResultsButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setFiltersVisible(false);
                }}
              >
                <Text style={styles.showResultsText}>
                  Pokaż wyniki ({filteredJobs.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LICZBA WYNIKÓW */}

        {!filtersVisible && hasActiveFilters && !loading && (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>
              {filteredJobs.length === 1
                ? "1 znalezione zlecenie"
                : `${filteredJobs.length} znalezionych zleceń`}
            </Text>

            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Wyczyść filtry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ŁADOWANIE */}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          !filtersVisible && (
            <View style={styles.jobsList}>
              {/* BRAK WYNIKÓW */}

              {filteredJobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name={
                      hasActiveFilters ? "search-outline" : "briefcase-outline"
                    }
                    size={44}
                    color="#94A3B8"
                  />

                  <Text style={styles.emptyTitle}>
                    {hasActiveFilters ? "Brak wyników" : "Brak zleceń"}
                  </Text>

                  <Text style={styles.emptyText}>
                    {hasActiveFilters
                      ? "Spróbuj zmienić wyszukiwaną frazę lub wybrane filtry."
                      : "Na razie nie ma żadnych aktywnych zleceń."}
                  </Text>

                  {hasActiveFilters && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={clearFilters}
                    >
                      <Text style={styles.clearButtonText}>Wyczyść filtry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* LISTA ZLECEŃ */

                filteredJobs.map((job) => (
                  <TouchableOpacity
                    key={job._id}
                    style={styles.jobCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/job/[id]",
                        params: {
                          id: job._id,
                        },
                      })
                    }
                  >
                    <View style={styles.jobTopRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {job.category}
                        </Text>
                      </View>

                      <Text style={styles.price}>{job.budget} zł</Text>
                    </View>

                    <Text style={styles.jobTitle}>{job.title}</Text>

                    <Text style={styles.jobDescription} numberOfLines={3}>
                      {job.description}
                    </Text>

                    <View style={styles.jobBottomRow}>
                      <View style={styles.locationRow}>
                        <Ionicons
                          name="location-outline"
                          size={17}
                          color="#6B7280"
                        />

                        <Text style={styles.location}>{job.city}</Text>
                      </View>

                      <Text style={styles.detailsText}>Szczegóły</Text>
                    </View>

                    <View style={styles.authorRow}>
                      <Ionicons
                        name="person-circle-outline"
                        size={18}
                        color="#94A3B8"
                      />

                      <Text style={styles.authorText}>
                        {job.author?.firstName} {job.author?.lastName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  mainScroll: {
    flex: 1,
  },

  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 22,
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2563EB",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748B",
  },

  searchRow: {
    flexDirection: "row",
    gap: 10,
  },

  searchBox: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  filterCount: {
    position: "absolute",
    right: -4,
    top: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },

  filterCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  categoriesWrapper: {
    height: 72,
    marginVertical: 14,
    justifyContent: "center",
  },

  categories: {
    gap: 10,
    paddingRight: 20,
    alignItems: "center",
  },

  categoryPill: {
    height: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  activeCategoryPill: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },

  activeCategoryText: {
    color: "#FFFFFF",
  },

  filtersPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 16,
  },

  filtersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  filtersTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginTop: 10,
  },

  filterInputWrapper: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
  },

  filterInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },

  budgetRow: {
    flexDirection: "row",
    gap: 10,
  },

  budgetInputWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  budgetInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    color: "#0F172A",
  },

  currencyText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  sortOptions: {
    gap: 8,
  },

  sortOption: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  activeSortOption: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
  },

  sortOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },

  activeSortOptionText: {
    color: "#2563EB",
    fontWeight: "700",
  },

  filterActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  resetFiltersButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  resetFiltersText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },

  showResultsButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  showResultsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  resultsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },

  clearFiltersText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  loadingContainer: {
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
  },

  jobsList: {
    paddingBottom: 30,
    gap: 14,
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },

  clearButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },

  clearButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  jobCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  jobTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },

  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16A34A",
  },

  jobTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  jobDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },

  jobBottomRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  location: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },

  detailsText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  authorText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
