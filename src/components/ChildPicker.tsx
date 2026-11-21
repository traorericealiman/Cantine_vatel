import { View } from 'react-native';
import { Tap } from './fx';
import { T } from './ui';
import { colors, radius } from '../lib/theme';
import { CHILDREN, useApp } from '../store/app';

/** Sélecteur d'enfant : une pastille par enfant rattaché. Rien n'est affiché s'il n'y en a qu'un. */
export function ChildPicker() {
  const selected = useApp((s) => s.selectedChild);
  const select = useApp((s) => s.selectChild);
  if (CHILDREN.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {CHILDREN.map((c) => {
        const on = c.id === selected;
        return (
          <Tap
            key={c.id}
            onPress={() => select(c.id)}
            scale={0.95}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingLeft: 8,
              paddingRight: 18,
              borderRadius: radius.pill,
              backgroundColor: on ? colors.brand : colors.card,
              borderWidth: 1,
              borderColor: on ? colors.brand : colors.line,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                marginRight: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? 'rgba(255,255,255,0.16)' : colors.brandSoft,
              }}
            >
              <T v="footnote" weight="700" color={on ? colors.onBrand : colors.brandText}>
                {c.first.slice(0, 1)}
              </T>
            </View>
            <T v="subhead" weight="600" color={on ? colors.onBrand : colors.text}>
              {c.first}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}
