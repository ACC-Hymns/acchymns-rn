import React, { useEffect, useState } from "react";
import { TouchableOpacity, useColorScheme, Image, View } from "react-native";
import { Asset } from "expo-asset";
import { Clef, getNotePng, Note } from "@/constants/assets";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const NoteButton = ({ note, clef, onClick }: { note: Note, clef: Clef, onClick: () => void }) => {
	const [imageUri, setImageUri] = useState<string | null>(null);
	const theme = useColorScheme() ?? 'light';

	useEffect(() => {

		if(note.length === 0)
			return;

		const loadPng = async () => {
			// Dynamically resolve asset
			const asset = getNotePng(note, clef);

			const resolvedAsset = Asset.fromModule(asset);
			await resolvedAsset.downloadAsync();

			setImageUri(resolvedAsset.localUri!);
		};

		loadPng();
	}, [note, clef]);

	if (note.length === 0) return (
		<TouchableOpacity onPress={onClick}
			style={{
				width: 65,
				height: 65,
				borderColor: Colors[theme].border,
				borderWidth: 1,
				borderRadius: 12,
				justifyContent: 'center',
				alignItems: 'center',
			}}>
			<Ionicons
				name={'musical-notes'}
				size={32}
				color={theme === 'dark' ? Colors.dark.text : Colors.light.text}
			/>
		</TouchableOpacity>
	);

	if(!imageUri) return (
		<TouchableOpacity onPress={onClick}>
			<View
				style={{
					width: 65,
					height: 65,
					borderColor: Colors[theme].border,
					borderWidth: 1,
					borderRadius: 12,
				}}
			/>
		</TouchableOpacity>
	);

	return (
		<TouchableOpacity onPress={onClick}>
			<Image
				source={{ uri: imageUri }}
				style={{
					width: 65,
					height: 65,
					resizeMode: 'contain',
					borderColor: Colors[theme].border,
					borderWidth: 1,
					borderRadius: 12,
				}}
				tintColor={theme === 'dark' ? 'white' : 'black'}
			/>
		</TouchableOpacity>
	)
};

export default NoteButton;
