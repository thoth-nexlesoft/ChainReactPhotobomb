import React, { Component } from 'react';
import {
  View,
  StatusBar,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  PanResponder,
  Dimensions
} from 'react-native';
import ReactNativeCamera from 'react-native-camera';
import Camera from '../Components/Camera';
import Button from '../Components/Button';
import styles from './Styles/CameraScreenStyles';
import { gql, graphql } from 'react-apollo';
import uploadPhoto from '../Services/PhotoUpload';
import PropPicker from '../Components/PropPicker';
import TransformableImage from '../Components/TransformableImage';
import { takeSnapshot } from 'react-native-view-shot';
import { Colors } from '../Themes';
import { allPhotosQuery } from './HomeScreen';

class CameraScreen extends Component {
  state = {
    currentPicture: {},
    isShowingPreview: false,
    isUploading: false,
    propImages: []
  };

  /**
   * Closes the preview modal.
   */
  closePreview = () => {
    this.setState({ isShowingPreview: false });
  };

  /**
   * Composes the picture and props as a single image.
   */
  createCompositePicture = async () => {
    const { currentPicture } = this.state;

    try {
      const path = await takeSnapshot(this.imageComponent, {
        format: 'jpeg',
        quality: 1
      });

      return { path };
    } catch (e) {
      console.error('Oops, snapshot failed. using photo without props', error);
    }
  };

  /**
   * Uploads the current picture to the API.
   */
  uploadPicture = async () => {
    const { currentPicture } = this.state;
    this.setState({ isUploading: true });

    const compositePicture = await this.createCompositePicture();

    try {
      const image = await uploadPhoto(compositePicture || currentPicture);

      await this.props.createPhoto({
        refetchQueries: [{ query: allPhotosQuery }],
        variables: {
          fileId: image.id
        }
      });

      this.props.navigation.goBack();
    } catch (e) {
      alert(e);
    } finally {
      this.setState({ isUploading: false });
    }
  };

  componentWillUnmount() {
    this.camera = null;
    this.imageComponent = null;
  }

  setCurrentPicture = currentPicture => {
    this.setState({ currentPicture, isShowingPreview: true });
  };

  takePicture = () => {
    this.camera.takePicture();
  };

  addPropToPicture = propImage => {
    const propImages = [...this.state.propImages, propImage];

    this.setState({ propImages });
  };

  renderPropImages = () => {
    return this.state.propImages.map((propImage, index) => {
      const key = `${propImage}-${index}`;

      return (
        <TransformableImage key={key}>
          <Image source={propImage} resizeMode="cover" />
        </TransformableImage>
      );
    });
  };

  render() {
    const { navigation } = this.props;

    return (
      <View style={styles.container}>
        <Camera
          ref={cam => (this.camera = cam)}
          onPicture={this.setCurrentPicture}
          onClose={() => this.props.navigation.goBack()}
        />
        <View style={styles.shutterControls}>
          <TouchableOpacity
            style={styles.cameraShutter}
            onPress={this.takePicture}
          />
        </View>

        <Modal visible={this.state.isShowingPreview} onRequestClose={() => {}}>
          {this.state.currentPicture.path &&
            <View style={{ flex: 1, backgroundColor: Colors.darkPurple }}>
              <View
                style={{ flex: 2 }}
                collapsable={false}
                ref={i => (this.imageComponent = i)}
              >
                <Image
                  style={{ height: '100%' }}
                  source={{ uri: this.state.currentPicture.path }}
                >
                  {this.renderPropImages()}
                </Image>
              </View>
              <View style={{ height: 160 }}>
                <Text style={styles.addPropText}>
                  Add props to your image!
                </Text>

                <PropPicker onPickProp={this.addPropToPicture} />
              </View>

              <View style={styles.uploadButtonContainer}>
                <Button
                  text={this.state.isUploading ? 'Uploading...' : 'Upload'}
                  onPress={this.uploadPicture}
                />
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={this.closePreview}
              >
                <Text style={styles.closeButtonText}>[Back]</Text>
              </TouchableOpacity>
            </View>}
        </Modal>
      </View>
    );
  }
}

const createPhoto = gql`
 mutation createPhoto($fileId: ID!) {
    createPhoto(fileId: $fileId) {
      id
      file {
        id
        url
      }
    }
  }
 `;

export default graphql(createPhoto, { name: 'createPhoto' })(CameraScreen);
