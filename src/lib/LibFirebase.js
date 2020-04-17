import { firebase } from "@firebase/app";
import { db } from "@/firebase";
import io from "socket.io-client";
import store from "@/store";

const options = {
  tansport: ["websocket", "polling"],
  secure: true,
  reconnect: true,
  rejectUnauthorized: false
};

const socket = io(process.env.VUE_APP_SERVER_URL, options);

export default {
  async getCurrentTrack() {
    console.log("Fb : getCurrentTrack");
    return db
      .collection("current_tracks")
      .where("room", "==", "room1")
      .limit(1)
      .get()
      .then(querySnapshot => {
        let currentTrack = null;
        querySnapshot.forEach(doc => {
          currentTrack = doc.data();
        });
        return currentTrack;
      })
      .catch(error => {
        console.error(error);
      });
  },

  async getQueue() {
    console.log("Fb : getQueue");
    return db
      .collection("tracks")
      .where("room", "==", "room1")
      .orderBy("vote", "desc")
      .orderBy("created", "asc")
      .get()
      .then(querySnapshot => {
        const tracks = [];
        querySnapshot.forEach(doc => {
          tracks.push(doc.data());
        });
        return tracks;
      })
      .catch(error => {
        console.error(error);
      });
  },

  addTrack(track) {
    console.log("Fb : addTrack");
    return db
      .collection("tracks")
      .add({
        room: "room1",
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        duration: track.duration_ms,
        image_big: track.album.images[0].url,
        image_medium: track.album.images[1].url,
        image_small: track.album.images[2].url,
        user: store.state.spotifyUser,
        vote: 0,
        voters: [],
        created: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
        socket.emit("E_ADD_TRACK");
      })
      .catch(error => {
        console.error(error);
      });
  },

  voteTrack(track, increment) {
    return db
      .collection("tracks")
      .where("room", "==", "room1")
      .where("id", "==", track.id)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          doc.ref
            .update({
              vote: track.vote + increment,
              voters: firebase.firestore.FieldValue.arrayUnion({
                ...store.state.spotifyUser,
                increment: increment
              })
            })
            .then(() => {
              socket.emit("E_VOTE_TRACK");
            });
        });
      })
      .catch(error => {
        console.error(error);
      });
  },

  async getUsers() {
    return db
      .collection("users")
      .where("room", "==", "room1")
      .get()
      .then(querySnapshot => {
        const users = [];
        querySnapshot.forEach(doc => {
          users.push(doc.data());
        });
        return users;
      })
      .catch(error => {
        console.error(error);
      });
  },

  addUser(user) {
    return db
      .collection("users")
      .doc(user.spotify_id)
      .set({
        room: "room1",
        spotify_id: user.spotify_id,
        name: user.name,
        spotify_url: user.spotify_url,
        image: user.image
      })
      .then(() => {
        socket.emit("E_USER_CONNECTED");
      })
      .catch(error => {
        console.error(error);
      });
  },

  removeUser(user) {
    return db
      .collection("users")
      .where("room", "==", "room1")
      .where("spotify_id", "==", user.spotify_id)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          doc.ref.delete();
        });
      })
      .catch(error => {
        console.error(error);
      });
  }
};
