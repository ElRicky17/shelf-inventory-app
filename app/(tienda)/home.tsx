import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel Principal</Text>
        <Text style={styles.headerSubtitle}>¿Qué deseas hacer hoy?</Text>
      </View>

      {/* Contenedor de opciones */}
      <View style={styles.optionsContainer}>
        
        {/* Botón principal - Suplir productos */}
        <TouchableOpacity 
          style={styles.mainCard}
          onPress={() => router.push('/suplir-productos')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={56} color="#FFFFFF" />
          </View>
          <Text style={styles.mainCardTitle}>Suplir Productos</Text>
          <Text style={styles.mainCardSubtitle}>
            Registra y actualiza el inventario de las góndolas
          </Text>
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward-circle" size={32} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Espacio para futuras funciones */}
        <View style={styles.emptyStateContainer}>
          <Ionicons name="rocket-outline" size={80} color="#E8E8E8" />
          <Text style={styles.emptyStateText}>Más funciones próximamente...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 25,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  mainCard: {
    backgroundColor: '#6C5CE7',
    borderRadius: 25,
    padding: 30,
    marginBottom: 25,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 220,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainCardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  mainCardSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    fontWeight: '500',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 25,
    right: 25,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#BDC3C7',
    fontWeight: '600',
    marginTop: 20,
  },
});