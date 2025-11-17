import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {/* Logo o icono principal */}
      <View style={styles.headerContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="storefront" size={48} color="#FFFFFF" />
        </View>
      </View>

      {/* Área de iconos de productos */}
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: '#FF6B9D' }]}>
          <Ionicons name="location" size={28} color="#FFFFFF" />
        </View>
        <View style={[styles.iconCircle, { backgroundColor: '#4ECDC4' }]}>
          <Ionicons name="cart" size={30} color="#FFFFFF" />
        </View>
        <View style={[styles.iconSquare, { backgroundColor: '#FFE66D' }]}>
          <Ionicons name="cube" size={28} color="#2C3E50" />
        </View>
        <View style={[styles.iconCircle, { backgroundColor: '#A8E6CF' }]}>
          <Ionicons name="basket" size={28} color="#2C3E50" />
        </View>
        <View style={[styles.iconCircle, { backgroundColor: '#FF8B94' }]}>
          <Ionicons name="pricetag" size={28} color="#FFFFFF" />
        </View>
        <View style={[styles.iconCircle, { backgroundColor: '#B4A7D6' }]}>
          <Ionicons name="bag-handle" size={28} color="#FFFFFF" />
        </View>
      </View>

      {/* Título y subtítulo */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>Tiendi</Text>
        <Text style={styles.subtitle}>Ten tu tienda siempre bajo control</Text>
      </View>

      {/* Botón para Home */}
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/home')}
        activeOpacity={0.7}
      >
       
        <Text style={styles.buttonText}>Empezemos...</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 25,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 30,
    paddingHorizontal: 10,
  },
  iconCircle: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconSquare: {
    width: 75,
    height: 75,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 15,
    marginBottom: 30,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});