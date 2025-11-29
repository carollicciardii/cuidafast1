  // Marca a "Minha Casa" (se existir, usando geopoint)
  db.collection("casas").doc("minhaCasa").get().then(doc => {
    if (doc && doc.exists) {
      const data = doc.data();
      if (data && data.geopoint) {
        const lat = data.geopoint.latitude;
        const lng = data.geopoint.longitude;

        const houseIcon = L.divIcon({
          className: "",
          html: '<i class="ph-house ph-bold ph-icon"></i>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        L.marker([lat, lng], { icon: houseIcon }).addTo(map).bindPopup("<b>Minha Casa</b>");
      }
    }
  }).catch(err => {
    console.warn("Erro ao buscar minhaCasa:", err);
  });

  // Escuta a coleção "cuidadores" (com geopoint) e atualiza o mapa chamando a função já existente
  db.collection("cuidadores").onSnapshot(snapshot => {
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      if (!data || !data.geopoint) return;
      // usa fallback para ultimoUpdate caso não exista
      const ultimo = data.ultimoUpdate || (firebase.firestore && firebase.firestore.Timestamp ? firebase.firestore.Timestamp.now() : new Date());
      atualizarCuidador(uid, data.geopoint.latitude, data.geopoint.longitude, ultimo);
    });
  });
