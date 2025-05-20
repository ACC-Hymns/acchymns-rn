import React from "react";
import { TouchableOpacity } from "react-native";
import { SvgXml } from "react-native-svg";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { Clef, getNoteSvg, Note } from "@/constants/assets";

const NoteButton = ({ note, clef, onClick }: { note: Note, clef: Clef, onClick: () => void }) => {
  const svgSource = getNoteSvg(note, clef);
  const SvgIcon = svgSource; 

  return (
    <TouchableOpacity onPress={onClick}>
      <SvgIcon width={50} height={50} />
    </TouchableOpacity>
  );
};

export default NoteButton;
