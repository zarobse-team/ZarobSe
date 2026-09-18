import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,

				tabBarStyle: {
					height: 92,
					paddingTop: 8,
					paddingBottom: 12,
					borderTopWidth: 1,
					borderTopColor: "#E5E7EB",
					backgroundColor: "#FFFFFF",
				},

				tabBarActiveTintColor: "#2563EB",
				tabBarInactiveTintColor: "#94A3B8",

				tabBarLabelStyle: {
					fontSize: 10,
					fontWeight: "600",
					marginTop: 2,
				},

				tabBarItemStyle: {
					paddingHorizontal: 0,
				},
			}}>
			<Tabs.Screen
				name='index'
				options={{
					title: "Przeglądaj",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='search' size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name='map'
				options={{
					title: "Mapa",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='map' size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name='post'
				options={{
					title: "Dodaj",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='add-circle' size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name='my-jobs'
				options={{
					title: "Moje",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='briefcase' size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name='profile'
				options={{
					title: "Profil",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name='person' size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
