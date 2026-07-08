import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { auth, db } from '../firebase/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function FavouriteScreen() {
  const { colors, spacing } = useTheme();
  const [favourites, setFavourites] = useState([]);

  useEffect(() => {
    async function loadFavourites() {
      if (!auth.currentUser) {
        setFavourites([]);
        return;
      }

      const favouritesQuery = query(
        collection(db, 'analyses'),
        where('userId', '==', auth.currentUser.uid),
        where('isFavorite', '==', true),
        orderBy('createdAt', 'desc'),
      );
      const snapshot = await getDocs(favouritesQuery);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setFavourites(items);
    }

    loadFavourites();
  }, []);

  function renderItem({ item }) {
    const score = item.result?.analysis?.roomScore?.overall;
    return (
      <AppCard>
        <View style={styles.row}>
          {item.roomImageBase64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${item.roomImageBase64}` }}
              style={styles.image}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.border }]} />
          )}
          <View style={styles.info}>
            <AppText variant="body" style={{ textTransform: 'capitalize', fontWeight: '600' }}>
              {item.mode}
            </AppText>
            <AppText variant="caption" style={{ color: colors.textSecondary }}>
              {item.createdAt?.toDate?.().toLocaleDateString() || ''}
            </AppText>
            {score != null && (
              <View style={[styles.scorePill, { backgroundColor: colors.primary + '18' }]}>
                <AppText variant="small" style={{ color: colors.primary, fontWeight: '600' }}>
                  Score {score}/100
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="title">❤️</AppText>
        </View>
      </AppCard>
    );
  }

  return (
    <AppContainer>
      {/* Screen Header */}
      <AppText variant="heading" style={{ marginBottom: spacing.lg }}>
        Favourites
      </AppText>

      {favourites.length === 0 ? (
        <AppCard>
          <AppText
            variant="body"
            style={{ color: colors.textSecondary, textAlign: 'center' }}
          >
            No favourites yet.{'\n'}Tap ♥ on any analysis to save it here.
          </AppText>
        </AppCard>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={favourites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  image: {
    borderRadius: 10,
    height: 80,
    width: 80,
  },
  imagePlaceholder: {
    borderRadius: 10,
    height: 80,
    width: 80,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  scorePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
