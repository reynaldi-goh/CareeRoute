import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

export default function ResumeScreen() {
  const [file, setFile] = useState(null);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

    console.log(result);

    if (!result.canceled) {
      setFile(result.assets[0]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <Text>Resume</Text>

      <TouchableOpacity onPress={pickResume} style={{ marginTop: 16 }}>
        <Text>Upload Resume</Text>
      </TouchableOpacity>

      {file && <Text style={{ marginTop: 10 }}>{file.name}</Text>}
    </SafeAreaView>
  );
}