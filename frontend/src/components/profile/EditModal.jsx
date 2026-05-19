// Modal emergente global y parametrizable para la edición de recursos (fotografías, hilos o comunidades)
export default function EditModal({ editItem, editForm, setEditForm, onSave, onCancel, saving, error }) {
  // Retorno temprano preventivo en caso de ausencia de elemento seleccionado
  if (!editItem) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      {/* Contenedor central de la ventana modal con detención de propagación de eventos de clic */}
      <div className="modal-content-glass fade-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, padding: 40 }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: 30, letterSpacing: '-1px' }}>
          {editItem.type === 'photo' && 'Editar foto'}
          {editItem.type === 'post' && 'Editar post'}
          {editItem.type === 'group' && 'Editar grupo'}
        </h2>
        
        {error && <div className="error-hint" style={{ marginBottom: 20 }}>{error}</div>}
        
        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controles del formulario específicos para la edición del pie de foto */}
          {editItem.type === 'photo' && (
            <div className="input-group">
              <label className="section-label-tiny" style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: 8, display: 'block' }}>Pie de foto</label>
              <textarea 
                className="input-glass-std" 
                rows={4} 
                style={{ resize: 'none' }}
                value={editForm.caption} 
                onChange={e => setEditForm({ ...editForm, caption: e.target.value })}
              />
            </div>
          )}

          {/* Controles del formulario específicos para la edición del contenido del post */}
          {editItem.type === 'post' && (
            <div className="input-group">
              <label className="section-label-tiny" style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: 8, display: 'block' }}>Contenido del post</label>
              <textarea 
                className="input-glass-std" 
                rows={6} 
                style={{ resize: 'none' }}
                value={editForm.body} 
                onChange={e => setEditForm({ ...editForm, body: e.target.value })}
              />
            </div>
          )}

          {/* Controles del formulario específicos para la edición de las propiedades de comunidades */}
          {editItem.type === 'group' && (
            <>
              {/* Zona para hacer clic y seleccionar o cambiar la foto del grupo */}
              <div className="group-avatar-upload-wrap">
                <div 
                  className="group-avatar-upload-circle"
                  onClick={() => document.getElementById('edit-group-img-profile').click()}
                >
                  {editForm.image ? (
                    <img src={URL.createObjectURL(editForm.image)} alt="Preview" />
                  ) : editItem.data?.image_url ? (
                    <img src={editItem.data.image_url} alt="Group Current" />
                  ) : (
                    <span style={{ fontSize: '2rem', opacity: 0.4 }}>＋</span>
                  )}
                </div>
                <button 
                  type="button"
                  className="group-avatar-upload-btn"
                  onClick={() => document.getElementById('edit-group-img-profile').click()}
                >
                  {editForm.image ? 'Cambiar imagen' : 'Seleccionar imagen (opcional)'}
                </button>
                <input 
                  id="edit-group-img-profile" 
                  type="file" 
                  accept="image/*" 
                  hidden 
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.files[0] || null })} 
                />
              </div>

              <input 
                className="input-glass-std" 
                value={editForm.name || ''} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                required 
                placeholder="Nombre de la comunidad" 
                maxLength={120} 
              />
              <textarea 
                className="input-glass-std" 
                style={{ minHeight: 100, resize: 'none' }} 
                value={editForm.description || ''} 
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
                placeholder="Descripción" 
              />
            </>
          )}

          {/* Controles de envío (guardar) o cancelación de cambios */}
          <div style={{ display: 'flex', gap: 15, marginTop: 20 }}>
            <button type="submit" className="btn-capsule accent round" style={{ flex: 2, padding: 18 }} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" className="btn-capsule secondary round" style={{ flex: 1, padding: 18 }} onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
